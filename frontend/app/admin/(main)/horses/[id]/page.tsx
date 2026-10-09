"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, List, Trash2 } from "lucide-react";
import {
  api,
  ApiError,
  photoFileUrl,
  type Horse,
  type PhotoDetail,
  type PhotoPart,
} from "@/lib/api";
import { CHIP_METHOD_LABEL, EXT, formatKst } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal/Modal";
import { useModal } from "@/components/hooks/useModal";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { PhotoViewer } from "@/components/horses/PhotoViewer";

type EditableKey = "horseNo" | "horseName" | "birthDate" | "sex" | "coatColor";
type EditForm = Record<EditableKey, string>;

const toForm = (h: Horse): EditForm => ({
  horseNo: h.horseNo ?? "",
  horseName: h.horseName ?? "",
  birthDate: h.birthDate ?? "",
  sex: h.sex ?? "",
  coatColor: h.coatColor ?? "",
});

const LABEL = "text-[#6D6D6D] font-semibold text-xl leading-6";
const INPUT =
  "flex-1 h-10 bg-white border-[#EBEBEB] text-sm font-medium leading-5 placeholder:text-[#E3E3E3]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 flex-1 min-w-[320px]">
      <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
        <span className={LABEL}>{label}</span>
        {required && <span className="text-[#D65856] font-semibold text-xl leading-6">*</span>}
      </div>
      {children}
    </div>
  );
}

function ReadOnly({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <div
      className={`flex-1 h-10 flex items-center px-3 rounded-md bg-stone-50 border border-[#EBEBEB] text-sm font-medium text-[#2A2A2A] ${
        mono ? "font-mono" : ""
      }`}
    >
      {value}
    </div>
  );
}

export default function HorseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const modal = useModal();
  const horseId = Number(id);
  const validId = /^[1-9][0-9]{0,9}$/.test(id) && Number.isSafeInteger(horseId);
  const NOT_FOUND = "말을 찾을 수 없습니다";

  const [horse, setHorse] = useState<Horse | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
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
    Promise.all([api.getHorse(horseId), api.listPhotoParts(), api.listHorsePhotos(horseId)])
      .then(([h, p, ph]) => {
        setHorse(h);
        setForm(toForm(h));
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

  // Group per part; representative first.
  const grouped = useMemo(
    () =>
      parts.map((part) => ({
        part,
        list: photos
          .filter((p) => p.partCode === part.code)
          .sort((a, b) => Number(b.isSelected) - Number(a.isSelected)),
      })),
    [parts, photos]
  );
  const shotParts = grouped.filter((g) => g.list.length > 0).length;

  // Flat order used by the viewer (prev/next across photos).
  const flat = useMemo(() => grouped.flatMap((g) => g.list), [grouped]);
  const foundIndex = viewerPhotoId === null ? -1 : flat.findIndex((x) => x.id === viewerPhotoId);
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

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])
      ) as Partial<Horse>;
      const updated = await api.updateHorse(horseId, body);
      setHorse(updated);
      setForm(toForm(updated));
      toast.success("말 정보가 수정되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "말 정보 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    modal.openModal({
      title: "말 삭제",
      message: "이 말과 촬영된 사진이 모두 삭제됩니다. 정말 삭제하시겠습니까?",
      onConfirm: async () => {
        try {
          await api.deleteHorse(horseId);
          toast.success("말이 삭제되었습니다.");
          router.push("/admin/horses");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "말 삭제에 실패했습니다.");
          throw e;
        }
      },
    });

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
      <div className="flex flex-col items-start gap-4 p-11">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/horses">목록으로</Link>
        </Button>
      </div>
    );
  if (!horse || !form) return <div className="p-11 text-[#727272]">불러오는 중...</div>;

  const setField = (k: EditableKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => (s ? { ...s, [k]: e.target.value } : s));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(horse));

  return (
    <div className="flex flex-col gap-10 p-11">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[#2A2A2A] font-semibold text-2xl leading-8">말 상세</h1>
          <span className="text-[#727272] text-base">
            {horse.horseName ?? horse.microchipNo}
          </span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild className="h-10 gap-2">
            <Link href="/admin/horses">
              <List />
              목록
            </Link>
          </Button>
          <Button
            onClick={downloadZip}
            disabled={zipping || photos.length === 0}
            className="h-10 gap-2"
          >
            <Download />
            {zipping ? "ZIP 생성 중..." : "전체 사진 다운로드"}
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-primary">기본 정보</h2>
        <div className="flex flex-wrap gap-4">
          <Field label="마이크로칩번호">
            <ReadOnly value={horse.microchipNo} mono />
          </Field>
          <Field label="칩 입력방식">
            <ReadOnly
              value={horse.chipInputMethod ? CHIP_METHOD_LABEL[horse.chipInputMethod] : "-"}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Field label="마번">
            <Input className={INPUT} placeholder="마번을 입력해주세요" value={form.horseNo} onChange={setField("horseNo")} maxLength={20} />
          </Field>
          <Field label="마명">
            <Input className={INPUT} placeholder="마명을 입력해주세요" value={form.horseName} onChange={setField("horseName")} maxLength={100} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Field label="생년월일">
            <Input className={INPUT} type="date" value={form.birthDate} onChange={setField("birthDate")} />
          </Field>
          <Field label="성별">
            <Input className={INPUT} placeholder="예) 수, 암, 거" value={form.sex} onChange={setField("sex")} maxLength={10} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Field label="모색">
            <Input className={INPUT} placeholder="예) 밤색" value={form.coatColor} onChange={setField("coatColor")} maxLength={30} />
          </Field>
          <Field label="등록일">
            <ReadOnly value={formatKst(horse.createdAt)} />
          </Field>
        </div>
      </section>

      {/* 촬영 사진 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-primary">촬영 사진</h2>
          <Badge variant="outline" className="rounded-lg border-primary text-primary">
            {shotParts}/{parts.length} 부위 · {photos.length}장
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {grouped.map(({ part, list }) => {
            const rep = list[0];
            return (
              <div
                key={part.code}
                className="flex flex-col gap-3 rounded-lg border border-[#E5E5E5] bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-[#2A2A2A]">{part.label}</span>
                  <span className="text-xs text-[#727272]">{list.length}장</span>
                </div>
                {rep ? (
                  <>
                    <button
                      type="button"
                      className="relative block w-full cursor-pointer"
                      onClick={() => setViewerPhotoId(rep.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rep.viewUrl}
                        onError={onImageError}
                        alt={rep.fileName}
                        className="w-full h-56 object-cover rounded bg-stone-50"
                      />
                      {rep.isSelected && (
                        <Badge className="absolute top-2 left-2 rounded-lg">대표</Badge>
                      )}
                    </button>
                    {list.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {list.slice(1).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setViewerPhotoId(p.id)}
                            className="cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.viewUrl}
                              onError={onImageError}
                              alt={p.fileName}
                              className="w-16 h-16 object-cover rounded border border-[#E5E5E5]"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-56 flex items-center justify-center rounded bg-stone-50 border border-dashed border-[#E5E5E5] text-[#727272] text-sm">
                    미촬영
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 하단 버튼 */}
      <div className="flex justify-between border-t border-[#E5E5E5] pt-6">
        <Button
          variant="outline"
          onClick={remove}
          className="h-10 gap-2 border-[#D65856] text-[#D65856] hover:bg-[#D65856]/5"
        >
          <Trash2 />
          삭제
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-10 px-6"
            disabled={!dirty || saving}
            onClick={() => setForm(toForm(horse))}
          >
            되돌리기
          </Button>
          <Button className="h-10 px-6" disabled={!dirty || saving} onClick={save}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      <PhotoViewer
        photos={flat}
        index={viewerIndex}
        onIndexChange={onViewerIndexChange}
        onSetRepresentative={setRepresentative}
        onImageError={onImageError}
      />

      <Modal
        isOpen={modal.isOpen}
        onClose={modal.handleCancel}
        title={modal.config?.title}
        message={modal.config?.message}
        onConfirm={modal.handleConfirm}
        isLoading={modal.isLoading}
        confirmText="삭제"
      />
    </div>
  );
}
