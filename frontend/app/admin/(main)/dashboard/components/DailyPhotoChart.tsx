"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { DailyPoint } from "../data";
import { PRIMARY, baseOptions } from "./chartTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function DailyPhotoChart({ points }: { points: DailyPoint[] }) {
  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: "업로드",
        data: points.map((p) => p.value),
        backgroundColor: PRIMARY,
        barThickness: 32,
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col self-stretch">
      <div className="h-[300px] w-full">
        <Bar data={data} options={baseOptions("업로드", "장")} />
      </div>
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="h-2 w-2" style={{ backgroundColor: PRIMARY }} />
        <span className="text-xs text-[#6D6D6D]">일별 업로드 사진</span>
      </div>
    </div>
  );
}
