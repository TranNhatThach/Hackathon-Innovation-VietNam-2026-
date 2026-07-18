import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = { title: "Bệnh viện Tim Hà Nội · Bản dùng thử", description: "Bản dùng thử hành trình người bệnh và vận hành nhân viên" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" suppressHydrationWarning><body className={inter.className} suppressHydrationWarning>{children}</body></html>;
}
