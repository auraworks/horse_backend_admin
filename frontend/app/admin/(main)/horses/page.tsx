"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Horse } from "@/lib/api";
import { formatDate, dash } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";

const LIMIT = 20;

type Filters = { microchipNo: string; horseNo: string; horseName: string };
const EMPTY: Filters = { microchipNo: "", horseNo: "", horseName: "" };

function buildQuery(page: number, f: Filters): string {
  const p = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    order: "id.desc",
  });
  (Object.keys(f) as (keyof Filters)[]).forEach((k) => {
    const v = f[k].trim();
    if (v) p.set(k, `ilike.%${v}%`);
  });
  return p.toString();
}

export default function HorsesPage() {
  const router = useRouter();
  const [form, setForm] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Horse[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listHorses(buildQuery(page, applied));
      setRows(res.data);
      setCount(res.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / LIMIT));

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied(form);
  };

  const setField =
    (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="px-12 py-14">
      <h1 className="text-2xl font-semibold text-[#2A2A2A] leading-8">
        말 촬영 관리
      </h1>

      <form onSubmit={search} className="mt-6 flex flex-wrap gap-3 items-center">
        <Input
          className="w-56"
          placeholder="마이크로칩번호"
          value={form.microchipNo}
          onChange={setField("microchipNo")}
        />
        <Input
          className="w-40"
          placeholder="마번"
          value={form.horseNo}
          onChange={setField("horseNo")}
        />
        <Input
          className="w-40"
          placeholder="마명"
          value={form.horseName}
          onChange={setField("horseName")}
        />
        <Button type="submit">검색</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setForm(EMPTY);
            setApplied(EMPTY);
            setPage(1);
          }}
        >
          초기화
        </Button>
        <span className="text-sm text-gray-500 ml-auto">총 {count}마리</span>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>마이크로칩번호</TableHead>
              <TableHead>마번</TableHead>
              <TableHead>마명</TableHead>
              <TableHead>모색</TableHead>
              <TableHead>성별</TableHead>
              <TableHead>생년월일</TableHead>
              <TableHead>칩 입력방식</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  등록된 말이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((h) => (
                <TableRow
                  key={h.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/horses/${h.id}`)}
                >
                  <TableCell>{h.id}</TableCell>
                  <TableCell className="font-mono">{h.microchipNo}</TableCell>
                  <TableCell>{dash(h.horseNo)}</TableCell>
                  <TableCell>{dash(h.horseName)}</TableCell>
                  <TableCell>{dash(h.coatColor)}</TableCell>
                  <TableCell>{dash(h.sex)}</TableCell>
                  <TableCell>{formatDate(h.birthDate)}</TableCell>
                  <TableCell>{dash(h.chipInputMethod)}</TableCell>
                  <TableCell>{formatDate(h.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 text-sm">
              {page} / {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
