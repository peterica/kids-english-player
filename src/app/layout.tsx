import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kids English Player V2",
  description:
    "부모가 검증된 영어 Content Library에서 Level과 Channel을 고르고, 아이는 추천·탐색·Auto Play로 영어 영상을 보는 가정용 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
