import { Sidebar } from "@/components/ui/Sidebar";
import { Suspense } from "react";

export default function MainAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* 좌측 사이드바 */}
      <Sidebar />

      {/* 우측 콘텐츠 영역 */}
      <main className="flex-1 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
