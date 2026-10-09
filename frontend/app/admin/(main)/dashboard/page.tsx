"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  api,
  apiFetch,
  type ListResponse,
  type Stats,
  type PhotoDetail,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface PhotoRow {
  id: number;
  horseId: number;
}

interface Thumb {
  id: number;
  horseId: number;
  url: string;
  label: string;
}

interface DashboardData {
  stats: Stats;
  recent: Thumb[];
}

async function loadDashboard(): Promise<DashboardData> {
  const [stats, recentRes] = await Promise.all([
    api.getStats(),
    apiFetch<ListResponse<PhotoRow>>(
      "photos?page=1&limit=10&order=createdAt.desc"
    ),
  ]);

  // Thumbnails need the presigned viewUrl, which PhotoDetail (per horse) has.
  const horseIds = [...new Set(recentRes.data.map((p) => p.horseId))];
  const detailMap = new Map<number, PhotoDetail>();
  await Promise.all(
    horseIds.map(async (hid) => {
      const list = await api.listHorsePhotos(hid);
      list.forEach((p) => detailMap.set(p.id, p));
    })
  );
  const recent: Thumb[] = [];
  for (const p of recentRes.data) {
    const d = detailMap.get(p.id);
    if (d)
      recent.push({
        id: d.id,
        horseId: d.horseId,
        url: d.viewUrl,
        label: d.partLabel,
      });
  }
  return { stats, recent };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshedOnce = useRef(false);

  useEffect(() => {
    loadDashboard()
      .then(setStats)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "불러오지 못했습니다.")
      );
  }, []);

  // A thumbnail failed (expired presigned URL): reload the dashboard once.
  const onImageError = () => {
    if (refreshedOnce.current) return;
    refreshedOnce.current = true;
    loadDashboard().then(setStats).catch(() => {});
  };

  const cards: [string, number | undefined][] = [
    ["등록 말 수", stats?.stats.horseCount],
    ["총 사진 수", stats?.stats.photoCount],
    ["6부위 촬영 완료 말 수", stats?.stats.horsesWithAllSixParts],
  ];

  return (
    <div className="px-12 py-14">
      <h1 className="text-2xl font-semibold text-[#2A2A2A] leading-8">
        대시보드
      </h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(([title, value]) => (
          <Card key={title} className="border border-gray-200 py-6 gap-3">
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{value ?? "-"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-[#2A2A2A]">
        최근 업로드 사진
      </h2>
      {stats && stats.recent.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">업로드된 사진이 없습니다.</p>
      )}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats?.recent.map((t) => (
          <Link
            key={t.id}
            href={`/admin/horses/${t.horseId}`}
            className="block border border-gray-200 rounded-md overflow-hidden hover:shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.url}
              alt={t.label}
              onError={onImageError}
              className="w-full h-32 object-cover"
            />
            <div className="px-2 py-1 text-xs text-gray-600">
              말 #{t.horseId} · {t.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
