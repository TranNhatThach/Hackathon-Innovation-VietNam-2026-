import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Bệnh viện Tim Hà Nội · Bản dùng thử", description: "Bản dùng thử hành trình người bệnh và vận hành nhân viên" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
