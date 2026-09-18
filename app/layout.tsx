import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEMES } from "@/lib/theme";

// 첫 화면에도 저장된 바탕색을 적용한다. 예전 모드 설정은 호환용으로만 읽는다.
const COLOR_SCRIPT = `try{
var raw=localStorage.getItem("app_colors_v2");
var c="${THEMES.dark.bg}";
var o;
if(raw!==null){o=JSON.parse(raw);}else{
var t=localStorage.getItem("app_theme")==="light"?"light":"dark";
c=t==="light"?"${THEMES.light.bg}":c;
try{o=JSON.parse(localStorage.getItem("app_colors")||"{}");o=o&&o[t];}catch(e){}
}
if(o&&typeof o.bg==="string"&&/^#[0-9a-f]{6}$/i.test(o.bg))c=o.bg;
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
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCRIPT }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
