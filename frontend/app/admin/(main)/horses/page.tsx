"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, RefreshCw, Search } from "lucide-react";
import { api, type ChipInputMethod, type Horse } from "@/lib/api";
import { CHIP_METHOD_LABEL, dash, formatDate, kstMidnightIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";

type SearchField = "microchipNo" | "horseNo" | "horseName";

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: "microchipNo", label: "마이크로칩번호" },
  { value: "horseNo", label: "마번" },
  { value: "horseName", label: "마명" },
];

interface Filters {
  from?: Date;
  to?: Date;
  chipInputMethod: "all" | ChipInputMethod;
  field: SearchField;
  keyword: string;
}

const EMPTY: Filters = { chipInputMethod: "all", field: "microchipNo", keyword: "" };

function buildQuery(page: number, limit: number, f: Filters): string {
  const p = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    order: "id.desc",
  });
  // Picked calendar days are KST dates: [from 00:00 KST, to+1 00:00 KST).
  if (f.from)
    p.append("createdAt", `gte.${kstMidnightIso(f.from.getFullYear(), f.from.getMonth(), f.from.getDate())}`);
  if (f.to)
    p.append("createdAt", `lt.${kstMidnightIso(f.to.getFullYear(), f.to.getMonth(), f.to.getDate() + 1)}`);
  if (f.chipInputMethod !== "all") p.set("chipInputMethod", `eq.${f.chipInputMethod}`);
  const kw = f.keyword.trim();
  if (kw) p.set(f.field, `ilike.%${kw}%`);
  return p.toString();
}

/** Page numbers to show: first, last, and a window around the current page. */
function pageItems(current: number, total: number): (number | "…")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function DateButton({
  value,
  onChange,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[142px] h-[38px] justify-between text-left font-normal bg-white border-[#EBEBEB]",
            value && "text-primary font-semibold"
          )}
        >
          {value ? (
            format(value, "yyyy-MM-dd", { locale: ko })
          ) : (
            <span className="text-[#727272] text-xs">날짜 입력</span>
          )}
          <CalendarIcon className="ml-auto h-3 w-3 text-[#727272]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 shadow-none" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}

const TH = "text-center text-[#0A0A0A] text-xs font-medium leading-5";
const TD = "text-center text-[#0A0A0A] text-xs font-medium leading-5";

export default function HorsesPage() {
  const router = useRouter();
  const [form, setForm] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState<Horse[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listHorses(buildQuery(page, limit, applied));
      setRows(res.data);
      setCount(res.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, applied]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / limit));

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied(form);
  };

  const reset = () => {
    setForm(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 px-12 py-14">
      <h1 className="text-2xl font-semibold text-[#2A2A2A] leading-8">말 촬영 관리</h1>

      {/* 검색 필터 */}
      <form onSubmit={search} className="flex flex-col gap-[18px] p-8 bg-stone-50 rounded">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-base font-semibold text-[#555] leading-6">등록일</label>
            <div className="flex items-center gap-2.5">
              <DateButton value={form.from} onChange={(d) => setForm((s) => ({ ...s, from: d }))} />
              <span className="text-xs text-black">-</span>
              <DateButton value={form.to} onChange={(d) => setForm((s) => ({ ...s, to: d }))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-base font-semibold text-[#555] leading-6">칩 입력방식</label>
            <Select
              value={form.chipInputMethod}
              onValueChange={(v) =>
                setForm((s) => ({ ...s, chipInputMethod: v as Filters["chipInputMethod"] }))
              }
            >
              <SelectTrigger className="w-[200px] h-[38px] bg-white border-[#EBEBEB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="ocr">{CHIP_METHOD_LABEL.ocr}</SelectItem>
                <SelectItem value="manual">{CHIP_METHOD_LABEL.manual}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[18px]">
          <div className="flex items-center gap-[22px] flex-1 min-w-[320px]">
            <Select
              value={form.field}
              onValueChange={(v) => setForm((s) => ({ ...s, field: v as SearchField }))}
            >
              <SelectTrigger className="w-[140px] h-[43px] bg-white border-[#EBEBEB] text-primary font-semibold text-xs px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="검색조건을 입력해주세요"
              value={form.keyword}
              onChange={(e) => setForm((s) => ({ ...s, keyword: e.target.value }))}
              className="flex-1 h-[43px] bg-white border-[#EBEBEB] text-xs placeholder:text-[#727272]"
            />
          </div>
          <div className="flex items-center gap-[18px]">
            <Button type="submit" className="w-[120px] h-[43px] font-semibold gap-2.5">
              <Search className="w-4 h-4" />
              검색
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="w-[120px] h-[43px] border-[1.6px] border-primary text-primary hover:bg-primary/5 gap-2.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="font-normal">초기화</span>
            </Button>
          </div>
        </div>
      </form>

      {/* 결과 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xl text-[#6D6D6D] leading-6 tracking-[-0.4px]">
          총 <span className="text-primary">{count.toLocaleString()}</span>마리
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 테이블 */}
      <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50 border-b border-[#E5E5E5]">
              <TableHead className={`${TH} w-[60px]`}>No</TableHead>
              <TableHead className={TH}>마이크로칩번호</TableHead>
              <TableHead className={TH}>마번</TableHead>
              <TableHead className={TH}>마명</TableHead>
              <TableHead className={TH}>모색</TableHead>
              <TableHead className={TH}>성별</TableHead>
              <TableHead className={TH}>생년월일</TableHead>
              <TableHead className={TH}>칩 입력방식</TableHead>
              <TableHead className={TH}>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className={`${TD} py-8 text-[#727272]`}>
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className={`${TD} py-8 text-[#727272]`}>
                  등록된 말이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((h, i) => (
                <TableRow
                  key={h.id}
                  onClick={() => router.push(`/admin/horses/${h.id}`)}
                  className="border-b border-[#E5E5E5] hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <TableCell className={TD}>{count - (page - 1) * limit - i}</TableCell>
                  <TableCell className={`${TD} font-mono`}>{h.microchipNo}</TableCell>
                  <TableCell className={TD}>{dash(h.horseNo)}</TableCell>
                  <TableCell className={TD}>{dash(h.horseName)}</TableCell>
                  <TableCell className={TD}>{dash(h.coatColor)}</TableCell>
                  <TableCell className={TD}>{dash(h.sex)}</TableCell>
                  <TableCell className={TD}>{formatDate(h.birthDate)}</TableCell>
                  <TableCell className="text-center">
                    {h.chipInputMethod ? (
                      <Badge
                        variant={h.chipInputMethod === "ocr" ? "default" : "outline"}
                        className="rounded-lg"
                      >
                        {CHIP_METHOD_LABEL[h.chipInputMethod]}
                      </Badge>
                    ) : (
                      <span className={TD}>-</span>
                    )}
                  </TableCell>
                  <TableCell className={TD}>{formatDate(h.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-start gap-6">
        <Select
          value={String(limit)}
          onValueChange={(v) => {
            setLimit(Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-auto h-[43px] bg-white border-[#EBEBEB] px-3 text-primary text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개씩 보기</SelectItem>
            <SelectItem value="20">20개씩 보기</SelectItem>
            <SelectItem value="50">50개씩 보기</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex w-full justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
              </PaginationItem>
              {pageItems(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <PaginationItem key={`e${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
