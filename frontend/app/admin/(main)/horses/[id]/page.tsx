"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  photoFileUrl,
  type Horse,
  type PhotoDetail,
  type PhotoPart,
} from "@/lib/api";
import { EXT, dash, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { PhotoViewer } from "@/components/horses/PhotoViewer";

export default function HorseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const horseId = Number(id);
  const validId = /^[1-9][0-9]{0,9}$/.test(id) && Number.isSafeInteger(horseId);
  const NOT_FOUND = "말을 찾을 수 없습니다";

  const [horse, setHorse] = useState<Horse | null>(null);
  const [parts, setParts] = useState<PhotoPart[]>([]);
  const [photos, setPhotos] = useState<PhotoDetail[]>([]);
  const [error, setError] = useState<string | null>(validId ? null : NOT_FOUND);
  const refreshedOnce = useRef(false);
  const [viewerPhotoId, setViewerPhotoId] = useState<number | null>(null);
  const [zipping, setZipping] = useState(false);

  const reloadPhotos = useCallback(async () => {
    setPhotos(await api.listHorsePhotos(horseId));
  }, [horseId]);

  // An <img> failed (expired presigned viewUrl): reload the list once.
  const onImageError = useCallback(() => {
    if (refreshedOnce.current) return;
    refreshedOnce.current = true;
    reloadPhotos().catch(() => {});
  }, [reloadPhotos]);

  useEffect(() => {
    if (!validId) return;
    Promise.all([
      api.getHorse(horseId),
      api.listPhotoParts(),
      api.listHorsePhotos(horseId),
    ])
      .then(([h, p, ph]) => {
        setHorse(h);
        setParts([...p].sort((a, b) => a.order - b.order));
        setPhotos(ph);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && (e.status === 404 || e.status === 422)
            ? NOT_FOUND
            : e instanceof Error
              ? e.message
              : "불러오지 못했습니다."
        )
      );
  }, [horseId, validId]);

  // Group per part; representative first, then newest first.
  const grouped = useMemo(() => {
    return parts.map((part) => {
      const list = photos
        .filter((p) => p.partCode === part.code)
        .sort((a, b) => Number(b.isSelected) - Number(a.isSelected));
      return { part, list };
    });
  }, [parts, photos]);

  // Flat order used by the viewer (prev/next across photos).
  const flat = useMemo(() => grouped.flatMap((g) => g.list), [grouped]);
  const openPhoto = (p: PhotoDetail) => setViewerPhotoId(p.id);
  const foundIndex =
    viewerPhotoId === null ? -1 : flat.findIndex((x) => x.id === viewerPhotoId);
  const viewerIndex = foundIndex >= 0 ? foundIndex : null;
  const onViewerIndexChange = (i: number | null) =>
    setViewerPhotoId(i === null ? null : (flat[i]?.id ?? null));

  const setRepresentative = async (p: PhotoDetail) => {
    try {
      await api.setRepresentative(p.horseId, p.partCode, p.id);
      await reloadPhotos();
      toast.success("대표 사진으로 지정했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "대표 지정에 실패했습니다.");
    }
  };

  const downloadZip = async () => {
    if (!horse || photos.length === 0) return;
    setZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const p of photos) {
        const res = await fetch(photoFileUrl(p.id));
        if (!res.ok) throw new Error(`사진 ${p.id} 다운로드 실패 (${res.status})`);
        zip.file(
          `${horse.microchipNo}_${p.partCode}_${p.id}.${EXT[p.fileFormat] ?? "jpg"}`,
          await res.arrayBuffer()
        );
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${horse.microchipNo}_photos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ZIP 생성에 실패했습니다.");
    } finally {
      setZipping(false);
    }
  };

  if (error)
    return (
      <div className="px-12 py-14">
        <p className="text-red-600">{error}</p>
        <Link href="/admin/horses" className="text-sm underline">
          목록으로
        </Link>
      </div>
    );
  if (!horse) return <div className="px-12 py-14 text-gray-500">불러오는 중...</div>;

  const info: [string, string][] = [
    ["ID", String(horse.id)],
    ["마이크로칩번호", horse.microchipNo],
    ["마번", dash(horse.horseNo)],
    ["마명", dash(horse.horseName)],
    ["모색", dash(horse.coatColor)],
    ["성별", dash(horse.sex)],
    ["생년월일", formatDate(horse.birthDate)],
    ["칩 입력방식", dash(horse.chipInputMethod)],
    ["등록일", formatDate(horse.createdAt)],
  ];

  return (
    <div className="px-12 py-14">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2A2A2A] leading-8">
          말 상세 #{horse.id}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/horses">목록</Link>
          </Button>
          <Button onClick={downloadZip} disabled={zipping || photos.length === 0}>
            {zipping ? "ZIP 생성 중..." : "전체 다운로드 ZIP"}
          </Button>
        </div>
      </div>

      <Card className="mt-6 border border-gray-200 py-6">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-lg font-semibold text-[#2A2A2A]">촬영 사진</h2>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {grouped.map(({ part, list }) => {
          const rep = list[0];
          return (
            <Card key={part.code} className="border border-gray-200 py-4 gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {part.label}
                  <span className="text-xs font-normal text-gray-500">
                    {list.length}장
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rep ? (
                  <>
                    <button
                      type="button"
                      className="relative block w-full cursor-pointer"
                      onClick={() => openPhoto(rep)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rep.viewUrl}
                        onError={onImageError}
                        alt={rep.fileName}
                        className="w-full h-56 object-cover rounded bg-gray-100"
                      />
                      {rep.isSelected && (
                        <Badge className="absolute top-2 left-2">대표</Badge>
                      )}
                    </button>
                    {list.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {list.slice(1).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => openPhoto(p)}
                            className="cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.viewUrl}
                              onError={onImageError}
                              alt={p.fileName}
                              className="w-16 h-16 object-cover rounded border border-gray-200"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-56 flex items-center justify-center rounded bg-gray-50 border border-dashed border-gray-300 text-gray-400">
                    미촬영
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PhotoViewer
        photos={flat}
        index={viewerIndex}
        onIndexChange={onViewerIndexChange}
        onSetRepresentative={setRepresentative}
        onImageError={onImageError}
      />
    </div>
  );
}
