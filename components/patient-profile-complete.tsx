"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icon";

const tabs = ["Tổng quan", "Lịch khám", "Thuốc", "Tài liệu", "Đồng thuận"] as const;
type Tab = (typeof tabs)[number];

export function PatientProfileComplete() {
  const [tab, setTab] = useState<Tab>("Tổng quan");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consent, setConsent] = useState(false);
  return <div className="container profile-page"><section className="profile-hero"><div className="avatar avatar--large">NA</div><div><Badge tone="info">Hồ sơ giả lập</Badge><h1>Nguyễn Văn An</h1><p>Mã người bệnh: BN-DEMO-0042 · 58 tuổi</p></div><Button variant="secondary" icon="settings" onClick={() => { setEditing(!editing); setSaved(false); }}>{editing ? "Đóng chỉnh sửa" : "Cập nhật thông tin"}</Button></section>
    {editing && <form className="portal-card profile-edit" onSubmit={(event) => { event.preventDefault(); setSaved(true); setEditing(false); }}><h2>Cập nhật thông tin liên hệ mô phỏng</h2><p>Không nhập dữ liệu cá nhân thật. Thay đổi chỉ tồn tại trên màn hình hiện tại.</p><div className="booking-form"><label><span>Số điện thoại</span><input inputMode="tel" defaultValue="0987 000 042"/></label><label><span>Kênh liên hệ ưu tiên</span><select defaultValue="web"><option value="web">Thông báo trong website</option><option value="phone">Điện thoại</option></select></label></div><Button type="submit" icon="check">Lưu trên bản dùng thử</Button></form>}
    {saved && <p className="inline-feedback" role="status"><Icon name="check" size={15}/> Đã cập nhật trên giao diện. Không có dữ liệu được lưu hoặc gửi đến bệnh viện.</p>}
    <nav className="profile-tabs" aria-label="Nội dung hồ sơ">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Tổng quan" && <div className="profile-grid"><section className="portal-card"><div className="content-heading"><div><h2>Thông tin liên hệ</h2><p>Dữ liệu hư cấu, chỉ dùng minh họa.</p></div><Button variant="ghost" onClick={() => setEditing(true)}>Chỉnh sửa</Button></div><dl className="profile-details"><div><dt>Số điện thoại</dt><dd>0987 000 042</dd></div><div><dt>Ngày sinh</dt><dd>12/04/1968</dd></div><div><dt>Địa chỉ</dt><dd>Phường Cửa Nam, Hà Nội</dd></div><div><dt>Kênh ưu tiên</dt><dd>Thông báo trong website</dd></div></dl></section><section className="portal-card"><div className="content-heading"><div><h2>Lịch khám tiếp theo</h2><p>Đã xác nhận</p></div><Icon name="calendar"/></div><div className="next-appointment"><strong>09:30</strong><span><b>17/07/2026</b>Phòng khám Tim mạch tổng quát</span></div><Link href="/appointments">Xem chi tiết <Icon name="arrow" size={16}/></Link></section><section className="portal-card current-visit-card"><div className="content-heading"><div><h2>Hành trình hiện tại</h2><p>Cập nhật lúc 10:24</p></div><Badge tone="warning">Đang diễn ra</Badge></div><div className="profile-queue"><span><small>Số thứ tự</small><strong>A024</strong></span><span><small>Bước hiện tại</small><strong>Chờ thanh toán</strong></span></div><Link href="/visit/VISIT-001" className="button button--primary">Theo dõi lượt khám</Link></section></div>}
    {tab === "Lịch khám" && <section className="portal-card tab-content"><Icon name="calendar"/><div><h2>Lịch khám đã xác nhận</h2><p>09:30 · 17/07/2026 · Phòng khám Tim mạch tổng quát</p><Link className="button button--primary" href="/appointments">Tra cứu lịch khám</Link></div></section>}
    {tab === "Thuốc" && <section className="portal-card tab-content"><Icon name="pill"/><div><h2>Lịch nhắc thuốc mô phỏng</h2><p>Xem các hướng dẫn đã duyệt; không tự thay đổi thuốc hoặc liều dùng.</p><Link className="button button--primary" href="/patient/medications">Mở lịch nhắc thuốc</Link></div></section>}
    {tab === "Tài liệu" && <section className="portal-card tab-content"><Icon name="file"/><div><h2>Quy trình khám ngoại trú QT.25.01</h2><p>Lần ban hành 07 · Ngày ban hành 05/12/2024.</p><div className="result-actions"><Link className="button button--primary" href="/procedures">Xem quy trình dễ đọc</Link><a className="button button--secondary" href="/tai-lieu/quy-trinh-ngoai-tru-tn1-cs1-qt-25-01.pdf" target="_blank" rel="noreferrer">Mở văn bản nguồn</a></div></div></section>}
    {tab === "Đồng thuận" && <section className="portal-card tab-content"><Icon name="shield"/><div><h2>Tùy chọn thông báo</h2><p>Đây không phải biểu mẫu đồng thuận y khoa.</p><label className="confirm-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>Cho phép hiển thị thông báo nhắc lịch trong bản dùng thử.</span></label><p className="inline-feedback" role="status">{consent ? "Đã bật thông báo trên giao diện." : "Thông báo đang tắt."} Không có lựa chọn nào được lưu.</p></div></section>}
  </div>;
}
