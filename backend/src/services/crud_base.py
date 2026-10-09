"""Generic list helpers: pagination, order=field.asc|desc, filters field=op.value."""
import datetime as dt
from collections.abc import Mapping
from typing import Any

from fastapi import HTTPException, Request
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

RESERVED = {"page", "limit", "order"}
OPS = {"eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"}


def _bad(msg: str) -> HTTPException:
    return HTTPException(status_code=400, detail=msg)


def _coerce(col: InstrumentedAttribute, raw: str, field: str) -> Any:
    ctype = col.type
    try:
        if getattr(ctype, "enum_class", None):
            return ctype.enum_class(raw)
        py = ctype.python_type
        if py is bool:
            if raw.lower() not in ("true", "false"):
                raise ValueError(raw)
            return raw.lower() == "true"
        if py is int:
            return int(raw)
        if py is float:
            return float(raw)
        if py is dt.datetime:
            return dt.datetime.fromisoformat(raw.replace("Z", "+00:00").replace(" ", "+"))
        if py is dt.date:
            return dt.date.fromisoformat(raw)
    except (ValueError, KeyError):
        raise _bad(f"Invalid value for filter '{field}': {raw!r}")
    return raw


def _condition(col: InstrumentedAttribute, op: str, raw: str, field: str):
    if op == "is":
        v = raw.lower()
        if v == "null":
            return col.is_(None)
        if v in ("true", "false"):
            return col.is_(v == "true")
        raise _bad(f"Filter '{field}': 'is' accepts null|true|false")
    if op == "in":
        body = raw[1:-1] if raw.startswith("(") and raw.endswith(")") else raw
        return col.in_([_coerce(col, x.strip(), field) for x in body.split(",") if x.strip()])
    if op in ("like", "ilike"):
        return getattr(col, op)(raw)
    v = _coerce(col, raw, field)
    return {
        "eq": col == v,
        "neq": col != v,
        "gt": col > v,
        "gte": col >= v,
        "lt": col < v,
        "lte": col <= v,
    }[op]


def apply_filters(stmt: Select, params: Mapping[str, str], fields: dict[str, InstrumentedAttribute]) -> Select:
    for key, value in params.items():
        if key in RESERVED:
            continue
        if key not in fields:
            raise _bad(f"Unknown filter field: {key}")
        op, sep, raw = value.partition(".")
        if not sep or op not in OPS:
            raise _bad(f"Invalid filter for '{key}': expected op.value with op in {sorted(OPS)}")
        stmt = stmt.where(_condition(fields[key], op, raw, key))
    return stmt


def apply_order(stmt: Select, order: str | None, fields: dict[str, InstrumentedAttribute], default) -> Select:
    if not order:
        return stmt.order_by(default)
    clauses = []
    for part in order.split(","):
        name, _, direction = part.partition(".")
        direction = direction or "asc"
        if name not in fields or direction not in ("asc", "desc"):
            raise _bad(f"Invalid order: {part!r}")
        clauses.append(fields[name].desc() if direction == "desc" else fields[name].asc())
    return stmt.order_by(*clauses)


async def list_rows(
    session: AsyncSession,
    model: type,
    fields: dict[str, InstrumentedAttribute],
    request: Request,
    page: int,
    limit: int,
    order: str | None,
) -> tuple[list, int]:
    base = apply_filters(select(model), request.query_params, fields)
    count = (await session.execute(select(func.count()).select_from(base.order_by(None).subquery()))).scalar_one()
    stmt = apply_order(base, order, fields, model.id.asc()).offset((page - 1) * limit).limit(limit)
    rows = list((await session.execute(stmt)).scalars().all())
    return rows, count


async def get_or_404(session: AsyncSession, model: type, id_: int, name: str):
    obj = await session.get(model, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return obj
