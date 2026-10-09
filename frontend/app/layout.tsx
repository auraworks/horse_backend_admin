import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "KRA 말 촬영 관리자",
    template: "%s | KRA 말 촬영 관리자",
  },
  description: "한국마사회 말 촬영 사진 관리자 페이지",
  applicationName: "KRA 말 촬영 관리자",
};

export const viewport: Viewport = {
  themeColor: "#104885",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
