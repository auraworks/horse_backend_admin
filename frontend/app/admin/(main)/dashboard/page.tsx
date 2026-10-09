"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  apiFetch,
  type ListResponse,
  type PartCode,
  type PhotoDetail,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const BODY_PARTS: PartCode[] = [
  "front_full",
  "forehead_close",
  "left_full",
  "right_full",
  "right_rear_oblique",
  "left_rear_oblique",
];

interface PhotoRow {
  id: number;
  horseId: number;
  partCode: PartCode;
  createdAt: string;
}

interface Thumb {
  id: number;
  horseId: number;
  url: string;
  label: string;
}

interface Stats {
  horses: number;
  photos: number;
  complete: number;
  recent: Thumb[];
}

async function loadAllPhotoRows(): Promise<{ rows: PhotoRow[]; count: number }> {
  const rows: PhotoRow[] = [];
  const limit = 100;
  let count = 0;
  for (let page = 1; page <= 200; page++) {
    const res = await apiFetch<ListResponse<PhotoRow>>(
      `photos?page=${page}&limit=${limit}`
    );
    count = res.count;
    rows.push(...res.data);
    if (rows.length >= res.count || res.data.length === 0) break;
  }
  return { rows, count };
}

async function loadStats(): Promise<Stats> {
  const [horses, all, recentRes] = await Promise.all([
    api.listHorses("page=1&limit=1"),
    loadAllPhotoRows(),
    apiFetch<ListResponse<PhotoRow>>(
      "photos?page=1&limit=10&order=createdAt.desc"
    ),
  ]);

  const byHorse = new Map<number, Set<PartCode>>();
  for (const r of all.rows) {
    if (!byHorse.has(r.horseId)) byHorse.set(r.horseId, new Set());
    byHorse.get(r.horseId)!.add(r.partCode);
  }
  let complete = 0;
  byHorse.forEach((parts) => {
    if (BODY_PARTS.every((p) => parts.has(p))) complete++;
  });

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

  return { horses: horses.count, photos: all.count, complete, recent };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats()
      .then(setStats)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "불러오지 못했습니다.")
      );
  }, []);

  const cards: [string, number | undefined][] = [
    ["등록 말 수", stats?.horses],
    ["총 사진 수", stats?.photos],
    ["6부위 촬영 완료 말 수", stats?.complete],
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
            <img src={t.url} alt={t.label} className="w-full h-32 object-cover" />
            <div className="px-2 py-1 text-xs text-gray-600">
              말 #{t.horseId} · {t.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
