import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "말 상세",
};

export default function HorseDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
