// Typed client for the backend API, called through the Next.js server proxy
// (/api/backend/...) so the browser never sees API_ACCESS_KEY.

export type PartCode =
  | "front_full"
  | "forehead_close"
  | "left_full"
  | "right_full"
  | "right_rear_oblique"
  | "left_rear_oblique"
  | "microchip";

export type ChipInputMethod = "ocr" | "manual";
export type FileFormat = "jpeg" | "png";

export interface PhotoPart {
  code: PartCode;
  label: string;
  order: number;
}

export interface Horse {
  id: number;
  microchipNo: string;
  chipInputMethod: ChipInputMethod | null;
  horseNo: string | null;
  horseName: string | null;
  birthDate: string | null;
  sex: string | null;
  coatColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Gps {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface PhotoMetadata {
  capturedAt: string;
  gps: Gps | null;
  iso: number | null;
  exposureTimeNs: number | null;
  fNumber: number | null;
  focalLengthMm: number | null;
  zoomRatio: number | null;
  afState: string | null;
  ambientLux: number | null;
  blurScore: number;
  brightness: number;
  deviceModel: string;
  metaSha256: string;
}

export interface PhotoDetail {
  id: number;
  horseId: number;
  partCode: PartCode;
  partLabel: string;
  isSelected: boolean;
  fileName: string;
  fileFormat: FileFormat;
  contentType: string;
  fileSize: number;
  fileSha256: string;
  width: number;
  height: number;
  checkCodes: string[];
  recognizedMicrochipNo: string | null;
  evidenceSource: ChipInputMethod | null;
  createdAt: string;
  viewUrl: string;
  metadata: PhotoMetadata | null;
}

export interface ListResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
}

export interface DownloadUrl {
  url: string;
  expiresIn: number;
  fileName: string;
}

export interface Stats {
  horseCount: number;
  photoCount: number;
  horsesWithAllSixParts: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api/backend";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}/${path.replace(/^\/+/, "")}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      typeof body?.detail === "string" ? body.detail : res.statusText;
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  getStats: () => apiFetch<Stats>("stats"),
  listPhotoParts: () => apiFetch<PhotoPart[]>("photo-parts"),
  listHorses: (query = "") =>
    apiFetch<ListResponse<Horse>>(`horses${query ? `?${query}` : ""}`),
  getHorse: (id: number) => apiFetch<Horse>(`horses/${id}`),
  getHorseByMicrochip: (microchipNo: string) =>
    apiFetch<Horse>(`horses/by-microchip/${encodeURIComponent(microchipNo)}`),
  createHorse: (body: Partial<Horse>) =>
    apiFetch<Horse>("horses", jsonInit("POST", body)),
  updateHorse: (id: number, body: Partial<Horse>) =>
    apiFetch<Horse>(`horses/${id}`, jsonInit("PATCH", body)),
  deleteHorse: (id: number) =>
    apiFetch<void>(`horses/${id}`, { method: "DELETE" }),
  listHorsePhotos: (horseId: number, partCode?: PartCode) =>
    apiFetch<PhotoDetail[]>(
      `horses/${horseId}/photos${partCode ? `?partCode=${partCode}` : ""}`
    ),
  setRepresentative: (horseId: number, slot: PartCode, photoId: number) =>
    apiFetch<PhotoDetail>(
      `horses/${horseId}/photos/${slot}/representative`,
      jsonInit("PUT", { photoId })
    ),
  deletePhoto: (id: number) =>
    apiFetch<void>(`photos/${id}`, { method: "DELETE" }),
  getDownloadUrl: (id: number) =>
    apiFetch<DownloadUrl>(`photos/${id}/download-url`),
};

/** Same-origin URL that streams the photo as an attachment (no S3 CORS needed). */
export const photoFileUrl = (id: number) => `/api/photos/${id}/file`;
