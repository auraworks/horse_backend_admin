import { api, apiFetch, type Horse, type ListResponse, type PhotoPart } from "@/lib/api";
import { kstMidnightIso, kstToday } from "@/lib/format";

/** Row count for a list endpoint with the given filters (fetches a single row). */
async function count(resource: "horses" | "photos", filters: [string, string][]) {
  const p = new URLSearchParams([["page", "1"], ["limit", "1"], ...filters]);
  const res = await apiFetch<ListResponse<unknown>>(`${resource}?${p}`);
  return res.count;
}

export interface DailyPoint {
  label: string;
  value: number;
}

export interface PartCount {
  part: PhotoPart;
  count: number;
}

export interface DashboardData {
  horseCount: number;
  photoCount: number;
  completeHorses: number;
  newHorsesToday: number;
  newPhotosToday: number;
  partCounts: PartCount[];
  dailyPhotos: DailyPoint[]; // last 7 days, oldest first
  monthlyHorses: DailyPoint[]; // cumulative horse count at the end of each of the last 6 months
  recentHorses: Horse[];
}

export async function loadDashboard(): Promise<DashboardData> {
  const { y, m0, d } = kstToday();
  const todayStart = kstMidnightIso(y, m0, d);

  // Last 7 KST days: [start, end) per day.
  const days = Array.from({ length: 7 }, (_, i) => {
    const offset = i - 6;
    const start = new Date(Date.UTC(y, m0, d + offset));
    return {
      label: `${start.getUTCMonth() + 1}/${start.getUTCDate()}`,
      from: kstMidnightIso(y, m0, d + offset),
      to: kstMidnightIso(y, m0, d + offset + 1),
    };
  });

  // Last 6 months (incl. current): cumulative count before the next month's start.
  const months = Array.from({ length: 6 }, (_, i) => {
    const offset = i - 5;
    const start = new Date(Date.UTC(y, m0 + offset, 1));
    return {
      label: `${start.getUTCMonth() + 1}월`,
      before: kstMidnightIso(y, m0 + offset + 1, 1),
    };
  });

  const parts = [...(await api.listPhotoParts())].sort((a, b) => a.order - b.order);

  const [stats, newHorsesToday, newPhotosToday, partCounts, dailyPhotos, monthlyHorses, recent] =
    await Promise.all([
      api.getStats(),
      count("horses", [["createdAt", `gte.${todayStart}`]]),
      count("photos", [["createdAt", `gte.${todayStart}`]]),
      Promise.all(
        parts.map(async (part) => ({
          part,
          count: await count("photos", [["partCode", `eq.${part.code}`]]),
        }))
      ),
      Promise.all(
        days.map(async (day) => ({
          label: day.label,
          value: await count("photos", [
            ["createdAt", `gte.${day.from}`],
            ["createdAt", `lt.${day.to}`],
          ]),
        }))
      ),
      Promise.all(
        months.map(async (m) => ({
          label: m.label,
          value: await count("horses", [["createdAt", `lt.${m.before}`]]),
        }))
      ),
      api.listHorses("page=1&limit=5&order=createdAt.desc"),
    ]);

  return {
    horseCount: stats.horseCount,
    photoCount: stats.photoCount,
    completeHorses: stats.horsesWithAllSixParts,
    newHorsesToday,
    newPhotosToday,
    partCounts,
    dailyPhotos,
    monthlyHorses,
    recentHorses: recent.data,
  };
}
