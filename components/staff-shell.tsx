"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/types";
import { ChatDrawer } from "@/components/chat-drawer";

const nav: { href: string; label: string; icon: IconName; badge?: string }[] = [
  { href: "/staff/operations", label: "Vận hành", icon: "kanban" },
  { href: "/staff/human-in-loop", label: "Can thiệp con người", icon: "help", badge: "4" },
  { href: "/staff/patients", label: "Người bệnh", icon: "users" },
  { href: "/staff/procedures", label: "Quy trình", icon: "book" },
  { href: "/staff/analytics", label: "Phân tích", icon: "chart" },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  return <div className="staff-app">
    <a className="skip-link" href="#staff-main">Chuyển đến nội dung chính</a>
    <aside className={`staff-sidebar ${navOpen ? "is-open" : ""}`}>
      <div className="staff-brand"><span><Icon name="heart" size={22} /></span><div><strong>TIM HÀ NỘI</strong><small>Cổng nhân viên</small></div><button className="icon-button staff-nav-close" aria-label="Đóng trình đơn" onClick={() => setNavOpen(false)}><Icon name="close" /></button></div>
      <nav aria-label="Điều hướng nhân viên">
        <p className="nav-section">KHÔNG GIAN LÀM VIỆC</p>
        {nav.map((item) => <Link key={item.label} href={item.href} onClick={() => setNavOpen(false)} className={pathname === item.href ? "active" : ""}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}</Link>)}
      </nav>
      <div className="sidebar-bottom"><div className="mock-label"><Icon name="shield" size={17} /><span><strong>Môi trường demo</strong><small>Chỉ dùng dữ liệu mô phỏng</small></span></div></div>
    </aside>
    {navOpen && <button className="sidebar-overlay" aria-label="Đóng trình đơn" onClick={() => setNavOpen(false)} />}
    <div className="staff-content">
      <header className="staff-topbar">
        <button className="icon-button staff-menu" aria-label="Mở trình đơn" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
        <label className="facility-select"><span>Cơ sở</span><select aria-label="Chọn cơ sở"><option>Cơ sở 1 · Hoàn Kiếm</option><option>Cơ sở 2 · Tây Hồ</option></select></label>
        <form className="global-search" onSubmit={(event) => { event.preventDefault(); if (search.trim()) router.push(`/staff/patients?q=${encodeURIComponent(search.trim())}`); }}><Icon name="search" size={19}/><label className="sr-only" htmlFor="staff-global-search">Tìm người bệnh hoặc mã lượt</label><input id="staff-global-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm người bệnh, mã lượt..."/><button type="submit" aria-label="Tìm kiếm"><Icon name="arrow" size={16}/></button></form>
        <span className="freshness"><i /> Dữ liệu lúc 10:24</span>
        <Link href="/staff/human-in-loop" className="icon-button notification-button" aria-label="Có 3 yêu cầu cần chú ý"><Icon name="bell"/><b>3</b></Link>
        <div className="staff-profile" aria-label="Người dùng hiện tại"><span>LA</span><span><strong>Lan Anh</strong><small>Điều phối viên</small></span></div>
      </header>
      <main id="staff-main" className="staff-main">{children}</main>
    </div>
    <button className="chat-launcher" onClick={() => setChatOpen(true)} aria-label="Mở trợ lý nhân viên"><Icon name="bot" /><span>Trợ lý nhân viên</span></button>
    <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
  </div>;
}
