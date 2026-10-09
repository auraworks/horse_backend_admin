import type { Metadata } from "next";

export const metadata: Metadata = {
  // Re-declare the root template so nested routes (e.g. 말 상세) keep the suffix
  title: { default: "말 촬영 관리", template: "%s | KRA 말 촬영 관리자" },
};

export default function HorsesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
