"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { DailyPoint } from "../data";
import { PRIMARY, PRIMARY_FILL, baseOptions } from "./chartTheme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function HorseTrendChart({ points }: { points: DailyPoint[] }) {
  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: "누적",
        data: points.map((p) => p.value),
        borderColor: PRIMARY,
        backgroundColor: PRIMARY_FILL,
        borderWidth: 2,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: PRIMARY,
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col self-stretch">
      <div className="h-[300px] w-full">
        <Line data={data} options={baseOptions("누적", "마리")} />
      </div>
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="h-0.5 w-4" style={{ backgroundColor: PRIMARY }} />
        <div
          className="h-2 w-2 rounded-full border bg-white"
          style={{ borderColor: PRIMARY }}
        />
        <span className="text-xs text-[#6D6D6D]">누적 등록 말</span>
      </div>
    </div>
  );
}
