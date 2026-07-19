"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/shared/icon";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand ${inverse ? "brand--inverse" : ""}`} aria-label="Bệnh viện Tim Hà Nội - Trang chủ"><span className="brand__mark"><Icon name="heart" size={25} /></span><span><strong>BỆNH VIỆN TIM HÀ NỘI</strong><small>HANOI HEART HOSPITAL</small></span></Link>;
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  return <div className={`patient-app ${largeText ? "patient-app--large-text" : ""}`}>
    <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
    <div className="accessibility-bar" aria-label="Công cụ hỗ trợ đọc">
      <div className="container accessibility-bar__inner">
        <span><Icon name="shield" size={16} /> Trang thông tin dành cho người bệnh</span>
        <div className="accessibility-tools">
          <span>Cỡ chữ</span>
          <button type="button" aria-pressed={!largeText} onClick={() => setLargeText(false)}>A</button>
          <button type="button" aria-pressed={largeText} onClick={() => setLargeText(true)} aria-label="Dùng cỡ chữ lớn">A+</button>
          <a href="tel:19001082"><Icon name="phone" size={16} /> Tổng đài: 19001082</a>
        </div>
      </div>
    </div>
    <header className="patient-header">
      <div className="patient-header__inner container">
        <Brand />
        <button className="icon-button mobile-menu" aria-label={open ? "Đóng trình đơn" : "Mở trình đơn"} aria-controls="patient-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
        <nav id="patient-navigation" aria-label="Điều hướng chính" className={open ? "patient-nav is-open" : "patient-nav"}>
          <Link href="/appointments">Đặt & tra cứu lịch</Link><Link href="/check-in">Xác nhận đến viện</Link><Link href="/procedures">Hướng dẫn khám</Link><Link href="/visit/VISIT-001">Theo dõi lượt khám</Link><Link href="/assistant">Hỏi đáp</Link>
          <Link className="nav-login" href="/patient/profile"><Icon name="user" size={17} /> Hồ sơ</Link>
          <a href="tel:115" className="emergency-link"><Icon name="phone" size={17} /> Cấp cứu: 115</a>
        </nav>
      </div>
    </header>
    <main id="main-content">{children}</main>
    <footer className="patient-footer">
      <div className="container footer-grid">
        <div><Brand inverse /><p>Chăm sóc trái tim bằng chuyên môn, sự tận tâm và kết nối.</p></div>
        <div><strong>Liên hệ</strong><p>92 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội</p><p>Hotline: <a href="tel:19001082">19001082</a></p></div>
        <div><strong>Thông tin hữu ích</strong><Link href="/privacy">Chính sách bảo mật</Link><Link href="/terms">Điều khoản sử dụng</Link><Link href="/#cap-cuu">Hướng dẫn cấp cứu</Link><Link href="/procedures">Quy trình QT.25.01</Link><Link href="/staff/operations">Cổng nhân viên (bản dùng thử)</Link></div>
      </div>
      <div className="container footer-bottom">© 2026 Bản dùng thử Bệnh viện Tim Hà Nội · Không sử dụng cho mục đích y khoa</div>
    </footer>
    <div className="patient-mobile-help" aria-label="Liên hệ nhanh">
      <a href="tel:19001082"><Icon name="phone" size={18}/> Gọi tổng đài</a>
      <Link href="/assistant"><Icon name="message" size={18}/> Hỏi đáp</Link>
    </div>
  </div>;
}
