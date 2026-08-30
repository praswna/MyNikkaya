import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEMES } from "@/lib/theme";

// 화면을 그리기 전에 저장해 둔 테마를 입힌다.
// 이게 없으면 라이트 모드인 사람도 앱을 열 때마다 어두운 화면이 한 번 번쩍인다
// (서버는 어느 테마인지 알 수 없어 늘 다크로 그려 보낸다).
// 설정 > 색 조절에서 바탕색을 바꿔 두었으면 그 색을 쓴다.
const THEME_SCRIPT = `try{
var t=localStorage.getItem("app_theme")==="light"?"light":"dark";
var c=t==="light"?"${THEMES.light.bg}":"${THEMES.dark.bg}";
var o=JSON.parse(localStorage.getItem("app_colors")||"{}");
if(o[t]&&o[t].bg)c=o[t].bg;
document.documentElement.dataset.theme=t;
document.documentElement.style.backgroundColor=c;
}catch(e){}`;

export const metadata: Metadata = {
  title: "불교 경전",
  description: "불교 명언을 만나보세요",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "불교 경전",
  },
};

export const viewport: Viewport = {
  themeColor: THEMES.dark.bg,
  width: "device-width",
  initialScale: 1,
  // 확대를 막지 않는다 - 글씨를 키워 보는 사람에게는 이게 유일한 방법일 수 있다
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
