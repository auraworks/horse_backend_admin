export const PRIMARY = "#104885";
export const PRIMARY_FILL = "rgba(16, 72, 133, 0.25)";

const axis = {
  grid: { display: true, color: "#E5E7EB", lineWidth: 1 },
  border: { display: true, color: "#E5E7EB" },
  ticks: { color: "#9CA3AF", font: { size: 12 } },
};

/** Shared chart.js options; `unit` is appended to tooltip values (e.g. "장"). */
export function baseOptions(seriesLabel: string, unit: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: PRIMARY,
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            `${seriesLabel}: ${(ctx.parsed.y ?? 0).toLocaleString()}${unit}`,
        },
      },
    },
    scales: {
      x: axis,
      y: { ...axis, beginAtZero: true, ticks: { ...axis.ticks, precision: 0 } },
    },
    layout: { padding: { top: 10, right: 10 } },
  };
}
