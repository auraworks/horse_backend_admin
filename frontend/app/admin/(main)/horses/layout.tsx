import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "말 촬영 관리",
};

export default function HorsesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
