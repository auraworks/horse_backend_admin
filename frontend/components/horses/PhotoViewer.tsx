"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { photoFileUrl, type PhotoDetail } from "@/lib/api";
import { dash, formatBytes, formatKst } from "@/lib/format";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Props {
  photos: PhotoDetail[]; // flat, in display order
  index: number | null;
  onIndexChange: (i: number | null) => void;
  onSetRepresentative: (p: PhotoDetail) => Promise<void>;
  onImageError?: () => void; // e.g. expired presigned URL: caller reloads the list
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;

export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onSetRepresentative,
  onImageError,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const photo = index !== null ? photos[index] : null;

  // Reset zoom whenever another photo is shown.
  useEffect(() => {
    setZoom(1);
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < photos.length - 1)
        onIndexChange(index + 1);
      else if (e.key === "Escape") onIndexChange(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndexChange]);

  if (index === null || !photo) return null;
  const m = photo.metadata;

  const rows: [string, React.ReactNode][] = [
    ["부위", photo.partLabel],
    ["촬영일시", formatKst(m?.capturedAt)],
    [
      "GPS",
      m?.gps ? (
        <a
          className="text-blue-600 underline"
          href={`https://www.google.com/maps?q=${m.gps.latitude},${m.gps.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          {m.gps.latitude}, {m.gps.longitude} (±{m.gps.accuracyMeters}m)
        </a>
      ) : (
        "-"
      ),
    ],
    ["ISO", dash(m?.iso)],
    ["노출시간", m?.exposureTimeNs != null ? `${m.exposureTimeNs} ns` : "-"],
    ["F값", dash(m?.fNumber)],
    ["초점거리", m?.focalLengthMm != null ? `${m.focalLengthMm} mm` : "-"],
    ["줌", dash(m?.zoomRatio)],
    ["AF", dash(m?.afState)],
    ["조도", dash(m?.ambientLux)],
    ["블러", dash(m?.blurScore)],
    ["밝기", dash(m?.brightness)],
    ["기기", dash(m?.deviceModel)],
    ["파일명", photo.fileName],
    ["형식", photo.contentType],
    ["크기", formatBytes(photo.fileSize)],
    ["해상도", `${photo.width} x ${photo.height}`],
    ["SHA256", <span key="sha" className="font-mono break-all">{photo.fileSha256}</span>],
    ["체크코드", photo.checkCodes.length ? photo.checkCodes.join(", ") : "-"],
  ];
  if (photo.partCode === "microchip") {
    rows.push(["인식 칩번호", dash(photo.recognizedMicrochipNo)]);
    rows.push(["증빙 방식", dash(photo.evidenceSource)]);
  }

  const setRep = async () => {
    setBusy(true);
    try {
      await onSetRepresentative(photo);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={() => onIndexChange(null)}>
      <div className="w-[min(1100px,95vw)]">
        <ModalHeader onClose={() => onIndexChange(null)}>
          <span className="flex items-center gap-2">
            {photo.partLabel}
            {photo.isSelected && <Badge>대표</Badge>}
            <span className="text-sm font-normal text-gray-500">
              {index + 1} / {photos.length}
            </span>
          </span>
        </ModalHeader>
        <ModalBody className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative h-[60vh] overflow-auto bg-gray-100 rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.viewUrl}
                alt={photo.fileName}
                onError={onImageError}
                style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
                className="block mx-auto"
              />
              <button
                aria-label="이전"
                disabled={index === 0}
                onClick={() => onIndexChange(index - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-1 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                aria-label="다음"
                disabled={index === photos.length - 1}
                onClick={() => onIndexChange(index + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-1 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / 1.25))}
              >
                <ZoomOut /> 축소
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25))}
              >
                <ZoomIn /> 확대
              </Button>
              <Button size="sm" variant="outline" onClick={() => setZoom(1)}>
                <Maximize /> 맞춤
              </Button>
              <span className="text-xs text-gray-500">
                {Math.round(zoom * 100)}%
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" asChild>
                  <a href={photoFileUrl(photo.id)} download>
                    <Download /> 다운로드
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || photo.isSelected}
                  onClick={setRep}
                >
                  {photo.isSelected ? "대표 사진" : "대표로 지정"}
                </Button>
              </div>
            </div>
          </div>
          <div className="md:w-80 max-h-[70vh] overflow-auto">
            <table className="w-full text-xs">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k} className="border-b align-top">
                    <th className="py-1.5 pr-2 text-left font-medium text-gray-500 whitespace-nowrap">
                      {k}
                    </th>
                    <td className="py-1.5 break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalBody>
      </div>
    </Modal>
  );
}
