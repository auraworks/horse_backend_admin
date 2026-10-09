"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { dash, formatDate } from "@/lib/format";
import DailyPhotoChart from "./components/DailyPhotoChart";
import HorseTrendChart from "./components/HorseTrendChart";
import { loadDashboard, type DashboardData } from "./data";

const fmt = (n: number | undefined) => (n === undefined ? "-" : n.toLocaleString());

function StatCard({
  title,
  rows,
  action,
}: {
  title: string;
  rows: [string, string][];
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Card className="flex flex-1 flex-col items-start gap-5 bg-white border border-[#E5E5E5] p-6">
      <h3 className="self-stretch text-lg font-bold leading-6 text-primary">{title}</h3>
      <div className="flex flex-col gap-3.5 self-stretch">
        <div className="flex flex-col gap-1 self-stretch">
          {rows.map(([label, value], i) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm leading-4 text-[#2A2A2A] opacity-70">{label}</span>
              <span
                className={`text-xl leading-6 tracking-[-0.4px] ${
                  i === 0 ? "text-[#2A2A2A]" : "text-[#6D6D6D]"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        {action && (
          <Button
            onClick={action.onClick}
            className="h-auto w-full rounded px-3 py-2.5 text-sm font-bold tracking-[-0.28px]"
          >
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

const TH = "text-center text-[#0A0A0A] text-xs font-medium leading-5";
const TD = "text-center text-[#0A0A0A] text-xs font-medium leading-5";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했습니다."));
  }, []);

  const goHorses = { label: "말 촬영 관리", onClick: () => router.push("/admin/horses") };
  const incomplete =
    data === null ? undefined : Math.max(0, data.horseCount - data.completeHorses);
  const maxPart = Math.max(1, ...(data?.partCounts.map((p) => p.count) ?? [0]));

  return (
    <div className="flex w-full flex-col gap-11 p-12">
      <h1 className="text-2xl font-bold leading-8 text-[#2A2A2A]">대시보드</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 요약 카드 */}
      <div className="flex flex-col md:flex-row gap-8 self-stretch">
        <StatCard
          title="말 등록 현황"
          rows={[
            ["오늘 신규", `${fmt(data?.newHorsesToday)}마리`],
            ["전체", `${fmt(data?.horseCount)}마리`],
          ]}
          action={goHorses}
        />
        <StatCard
          title="사진 촬영 현황"
          rows={[
            ["오늘 업로드", `${fmt(data?.newPhotosToday)}장`],
            ["전체", `${fmt(data?.photoCount)}장`],
          ]}
          action={goHorses}
        />
        <StatCard
          title="6부위 촬영 완료"
          rows={[
            ["완료", `${fmt(data?.completeHorses)}마리`],
            ["미완료", `${fmt(incomplete)}마리`],
          ]}
          action={goHorses}
        />
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 self-stretch">
        <Card className="flex flex-col gap-6 bg-white border border-[#E5E5E5] p-6">
          <h3 className="text-xl font-bold leading-6 text-black">최근 7일 사진 업로드</h3>
          {data && <DailyPhotoChart points={data.dailyPhotos} />}
        </Card>
        <Card className="flex flex-col gap-6 bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold leading-6 text-black">말 등록 추세</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#6D6D6D]">전체</span>
              <span className="text-xl font-bold text-black">{fmt(data?.horseCount)}마리</span>
            </div>
          </div>
          {data && <HorseTrendChart points={data.monthlyHorses} />}
        </Card>
      </div>

      {/* 부위별 사진 수 + 최근 등록 말 */}
      <div className="flex flex-col xl:flex-row gap-8 self-stretch">
        <Card className="flex xl:w-[328px] shrink-0 flex-col gap-2 bg-white border border-[#E5E5E5] p-6">
          <h3 className="text-xl font-bold leading-6 text-black">부위별 사진 수</h3>
          <div className="flex items-center justify-between py-2 text-sm font-bold text-[#6D6D6D]">
            <span>부위</span>
            <span>사진 수</span>
          </div>
          <div className="flex flex-col gap-2">
            {data?.partCounts.map(({ part, count }) => (
              <div key={part.code} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#555]">{part.label}</span>
                  <span className="font-bold text-primary">{count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full rounded bg-primary/10">
                  <div
                    className="h-1.5 rounded bg-primary"
                    style={{ width: `${(count / maxPart) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-1 min-w-0 flex-col gap-6 bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#2A2A2A] leading-8">최근 등록된 말</h3>
            <Button onClick={goHorses.onClick} className="h-10">
              <span className="text-sm font-semibold tracking-[-0.28px]">전체 보기</span>
            </Button>
          </div>
          <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50 border-b border-[#E5E5E5]">
                  <TableHead className={TH}>마이크로칩번호</TableHead>
                  <TableHead className={TH}>마번</TableHead>
                  <TableHead className={TH}>마명</TableHead>
                  <TableHead className={TH}>성별</TableHead>
                  <TableHead className={TH}>등록일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.recentHorses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className={`${TD} py-8`}>
                      등록된 말이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.recentHorses.map((h) => (
                    <TableRow
                      key={h.id}
                      onClick={() => router.push(`/admin/horses/${h.id}`)}
                      className="border-b border-[#E5E5E5] hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <TableCell className={`${TD} font-mono`}>{h.microchipNo}</TableCell>
                      <TableCell className={TD}>{dash(h.horseNo)}</TableCell>
                      <TableCell className={TD}>{dash(h.horseName)}</TableCell>
                      <TableCell className={TD}>{dash(h.sex)}</TableCell>
                      <TableCell className={TD}>{formatDate(h.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
