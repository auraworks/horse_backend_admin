"use client";

import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between bg-white px-10 shadow-[0_4px_12px_0_rgba(83,46,14,0.12)]">
      <div className="flex items-center gap-1 flex-1">
        <Link href="/admin/login">
          <Image src="/logo.jpg" alt="Logo" width={150} height={50} />
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/admin/login" className="flex items-center gap-2">
          <Image src="/profile.svg" alt="Profile" width={24} height={24} />

          <span className="text-[#6D6D6D] text-base font-normal leading-6 tracking-[-0.32px]">
            홍길동님
          </span>
        </Link>
      </div>
    </header>
  );
}
