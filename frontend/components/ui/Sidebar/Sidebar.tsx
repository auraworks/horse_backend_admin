"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { IoLogOutOutline } from "react-icons/io5";
import Image from "next/image";
import { menuSections, type MenuItem } from "./constants";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isSubItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isMenuActive = (item: MenuItem) => {
    if (item.href && !item.subItems) {
      return isSubItemActive(item.href);
    }
    if (item.subItems) {
      return item.subItems.some(sub => isSubItemActive(sub.href));
    }
    return false;
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="w-64 bg-stone-50 h-screen max-h-screen sticky top-0 flex flex-col">
      {/* 헤더 */}
      <div className="p-8 flex justify-center">
        <Image src="/KRA.jfif" alt="한국마사회" width={160} height={78} unoptimized className="mix-blend-multiply" />
      </div>

      {/* 메인 네비게이션 */}
      <nav className="px-5 py-4 flex-1 overflow-y-auto">
        <ul className="space-y-7">
          {menuSections.map((section, sectionIndex) => (
            <li key={sectionIndex}>
              {section.items.map((item, itemIndex) => {
                const isActive = isMenuActive(item);
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <div key={itemIndex} className={itemIndex !== section.items.length - 1 ? "mb-4" : ""}>
                    {/* 1뎁스 메뉴 아이템 */}
                    {item.href && !hasSubItems ? (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <div
                        className={`flex items-center gap-3 px-5 py-3 text-base font-semibold transition-colors ${
                          isActive ? "text-primary" : "text-gray-700"
                        }`}
                      >
                        {item.label}
                      </div>
                    )}

                    {/* 2뎁스 서브 메뉴 - 작은 글씨 + 들여쓰기 */}
                    {hasSubItems && (
                      <ul className="mt-2 space-y-1.5">
                        {item.subItems!.map((subItem, subIndex) => {
                          const isSubActive = isSubItemActive(subItem.href);
                          return (
                            <li key={subIndex}>
                              <Link
                                href={subItem.href}
                                className={`flex items-center gap-2.5 pl-9 pr-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                                  isSubActive
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
      </nav>

      {/* 로그아웃 버튼 */}
      <div className="p-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-2.5 px-5 py-3 text-base text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          <IoLogOutOutline className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
