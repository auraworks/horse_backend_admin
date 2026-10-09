export interface SubItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface MenuItem {
  label: string;
  href?: string;
  subItems?: SubItem[];
  isCollapsible?: boolean;
}

export interface MenuSection {
  header: string;
  items: MenuItem[];
}

export const menuSections: MenuSection[] = [
  {
    header: "관리",
    items: [
      { label: "대시보드", href: "/admin/dashboard" },
      { label: "말 촬영 관리", href: "/admin/horses" },
    ],
  },
];
