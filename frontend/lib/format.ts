const kst = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** UTC ISO string -> "2026. 10. 09. 14:03:21 (KST)" */
export function formatKst(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${kst.format(d)} (KST)`;
}

const kstDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Timestamp (UTC ISO) -> KST date "YYYY-MM-DD". Plain dates (birthDate) pass through. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : kstDate.format(d);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export const dash = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "-" : String(v);

export const EXT: Record<string, string> = { jpeg: "jpg", png: "png" };
