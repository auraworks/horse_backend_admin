import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/ui/LoginForm/login-form";

export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* 왼쪽: 로고 + 로그인 폼 */}
      <div className="flex  flex-col gap-4 p-6 md:p-10">
        {/* 로고 영역 */}
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="">
              <Image src="/KRA.jfif" alt="한국마사회" width={120} height={59} unoptimized />
            </div>
            관리자 페이지
          </a>
        </div>
        {/* 로그인 폼 영역 */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>
      {/* 오른쪽: 배경 이미지 (대형 화면에서만 표시) */}
      <div className="relative bg-muted hidden lg:block">
        <Image
          src="/admin.jpg"
          alt="Admin Background"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
    </div>
  );
}
