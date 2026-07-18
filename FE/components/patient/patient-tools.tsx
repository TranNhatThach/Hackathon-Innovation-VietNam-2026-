"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Badge, Button, DemoStateControl, StateView } from "@/components/shared/ui";
import type { Appointment, LoadState, Medication } from "@/types";

type AppointmentApi = {
  appointment_code: string; scheduled_at: string; status: Appointment["status"]; facility: string;
  department: string; doctor: string | null; visit_type: string; payment_type: Appointment["paymentType"];
};

const fromAppointmentApi = (result: AppointmentApi): Appointment => {
  const scheduledAt = new Date(result.scheduled_at);
  return {
    id: result.appointment_code,
    date: scheduledAt.toLocaleDateString("vi-VN"),
    time: scheduledAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    facility: result.facility, department: result.department, doctor: result.doctor ?? "Chờ phân công",
    patientDisplayName: "", visitType: result.visit_type, paymentType: result.payment_type,
    status: result.status, documents: [],
  };
};

export function PatientPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="portal-heading"><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></section>;
}

export function AppointmentLookup({ appointment, defaultMode = "lookup" }: { appointment: Appointment; defaultMode?: "lookup" | "book" }) {
  const [mode, setMode] = useState<"lookup" | "book">(defaultMode);
  const [searched, setSearched] = useState(false);
  const [lookupAppointment, setLookupAppointment] = useState<Appointment | null>(null);
  const [lookupPhone, setLookupPhone] = useState("");
  const [appointmentHistory, setAppointmentHistory] = useState<Appointment[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [state, setState] = useState<LoadState>("ready");
  const displayedAppointment = lookupAppointment ?? appointment;
  useEffect(() => {
    setLookupPhone(window.localStorage.getItem("appointment_phone") ?? "");
  }, []);
  const submitLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = lookupPhone.trim();
    const code = String(form.get("appointment_code") ?? "").trim();
    setSearched(true);
    setShowHistory(false);
    setLookupAppointment(null);
    setState("loading");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/appointments/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
      if (response.status === 404) { setState("empty"); return; }
      if (!response.ok) throw new Error("Không thể tra cứu lịch hẹn");
      const result = await response.json() as AppointmentApi;
      setLookupAppointment(fromAppointmentApi(result));
      setState("ready");
    } catch {
      setState("error");
    }
  };
  const loadHistory = async (page: number) => {
    const phone = lookupPhone.trim();
    if (!phone) {
      document.querySelector<HTMLInputElement>('input[name="lookup_phone"]')?.reportValidity();
      return;
    }
    setSearched(false);
    setShowHistory(true);
    setAppointmentHistory([]);
    setState("loading");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/appointments?phone=${encodeURIComponent(phone)}&page=${page}&page_size=5`);
      if (!response.ok) throw new Error("Không thể tải lịch sử đặt lịch");
      const result = await response.json() as { items: AppointmentApi[]; total: number; page: number; total_pages: number };
      setAppointmentHistory(result.items.map(fromAppointmentApi));
      setHistoryPage(result.page);
      setHistoryTotal(result.total);
      setHistoryTotalPages(result.total_pages);
      setState(result.total ? "ready" : "empty");
    } catch {
      setState("error");
    }
  };
  const submitHistory = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void loadHistory(1);
  };
  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bookingPhone = String(form.get("phone") ?? "").trim();
    setBookingError("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: form.get("patient_name"), phone: bookingPhone, department: form.get("department"),
          payment_type: form.get("payment_type"), preferred_date: form.get("preferred_date"), preferred_period: form.get("preferred_period"),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string | Array<{ msg?: string }> } | null;
        const detail = Array.isArray(payload?.detail) ? payload.detail.map((item) => item.msg).filter(Boolean).join("; ") : payload?.detail;
        throw new Error(detail || "Không thể lưu yêu cầu đặt lịch");
      }
      const result = await response.json() as { appointment_code: string };
      setBooked(true);
      setBookingCode(result.appointment_code);
      window.localStorage.setItem("appointment_phone", bookingPhone);
      setLookupPhone(bookingPhone);
    } catch (error) {
      setBooked(false);
      setBookingError(error instanceof Error ? error.message : "Không thể lưu yêu cầu đặt lịch");
    }
  };
  return <div className="container portal-layout"><section className="portal-card lookup-card">
    <div className="appointment-mode" role="tablist" aria-label="Chọn tác vụ lịch khám"><button role="tab" aria-selected={mode === "book"} onClick={() => { setMode("book"); setSearched(false); }}>Đặt lịch khám</button><button role="tab" aria-selected={mode === "lookup"} onClick={() => { setMode("lookup"); setBooked(false); }}>Tra cứu lịch đã đặt</button></div>
    {mode === "lookup" ? <><div className="portal-card__heading"><span><Icon name="search"/></span><div><h2>Tìm lịch khám đã đặt</h2><p>Nhập số điện thoại và mã lịch đã nhận để tra cứu.</p></div></div><form onSubmit={submitLookup} className="patient-form"><label><span>Số điện thoại</span><input name="lookup_phone" required inputMode="tel" value={lookupPhone} onChange={(event) => setLookupPhone(event.target.value)} placeholder="Số điện thoại đã dùng khi đặt lịch"/><small>{lookupPhone ? "Đã nhớ số điện thoại dùng khi đặt lịch gần nhất." : "Nhập số điện thoại đã dùng khi đặt lịch."}</small></label><label><span>Mã lịch hẹn</span><input name="appointment_code" required placeholder="Ví dụ: HEN-260717-ABC123"/></label><Button type="submit" icon="search">Tra cứu lịch khám</Button></form></> : <><div className="portal-card__heading"><span><Icon name="calendar"/></span><div><h2>Gửi yêu cầu đặt lịch</h2><p>Nhập thông tin của bạn; nhân viên sẽ xác nhận lịch sau khi tiếp nhận.</p></div></div>{booked ? <div className="booking-success" role="status"><span><Icon name="check"/></span><div><h3>Đã lưu yêu cầu đặt lịch</h3><p>Mã yêu cầu <strong>{bookingCode || "Đang lưu..."}</strong>. Hãy lưu mã này hoặc xem lại bằng số điện thoại trong lịch sử đặt lịch.</p><div className="result-actions"><Link className="button button--primary" href="/procedures#dat-lich">Xem bước chuẩn bị</Link><Button variant="secondary" onClick={() => { setBooked(false); setBookingCode(""); }}>Tạo yêu cầu khác</Button></div></div></div> : <form className="booking-form" onSubmit={submitBooking}><label><span>Họ và tên</span><input name="patient_name" required autoComplete="name" placeholder="Nhập họ và tên"/></label><label><span>Số điện thoại</span><input name="phone" required inputMode="tel" autoComplete="tel" placeholder="Nhập số điện thoại"/></label><label><span>Nhu cầu khám</span><select name="department" required defaultValue=""><option value="" disabled>Chọn nhu cầu khám</option><option value="Phòng khám Tim mạch tổng quát">Khám Tim mạch tổng quát</option><option value="Tái khám theo giấy hẹn">Tái khám theo giấy hẹn</option><option value="Tư vấn chuyên khoa">Cần nhân viên tư vấn chuyên khoa</option></select></label><label><span>Hình thức dự kiến</span><select name="payment_type" required defaultValue=""><option value="" disabled>Chọn hình thức</option><option value="BHYT">Bảo hiểm y tế</option><option value="Dịch vụ">Dịch vụ</option></select></label><label><span>Ngày mong muốn</span><input name="preferred_date" required type="date"/></label><label><span>Khung giờ mong muốn</span><select name="preferred_period" required defaultValue=""><option value="" disabled>Chọn khung giờ</option><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option></select></label>{bookingError && <p className="form-note" role="alert"><Icon name="alert" size={16}/> {bookingError}</p>}<p className="form-note"><Icon name="shield" size={16}/> Yêu cầu sẽ được lưu và cần nhân viên xác nhận trước khi trở thành lịch khám chính thức.</p><Button type="submit" icon="arrow">Gửi yêu cầu đặt lịch</Button></form>}</>}
    {mode === "lookup" && <div className="demo-row"><Button type="button" variant="secondary" icon="calendar" onClick={submitHistory}>Xem lịch sử đặt lịch</Button></div>}</section>
    <aside className="privacy-panel"><Icon name="shield"/><h2>Bảo vệ thông tin đặt lịch</h2><p>Thông tin biểu mẫu được lưu trong hệ thống để nhân viên tiếp nhận yêu cầu.</p><ul><li><Icon name="check"/> Chỉ thu thập thông tin cần thiết</li><li><Icon name="check"/> Lịch cần được nhân viên xác nhận</li><li><Icon name="check"/> Không nhập thông tin bệnh án tại đây</li></ul><Link href="/procedures" className="text-button">Xem quy trình QT.25.01 <Icon name="arrow" size={14}/></Link></aside>
    {mode === "lookup" && showHistory && <section className="lookup-result portal-card appointment-history" aria-live="polite">{state !== "ready" ? <StateView state={state} emptyText="Chưa có lịch sử đặt lịch cho số điện thoại này." onRetry={() => setShowHistory(false)}/> : <><header className="appointment-history__header"><div><span className="eyebrow">LỊCH HẸN CỦA BẠN</span><h2>Lịch sử đặt lịch</h2><p>{historyTotal} lịch · sắp xếp theo thời gian mới nhất</p></div><span className="appointment-history__page">{historyPage} / {historyTotalPages}</span></header><div className="appointment-history__list">{appointmentHistory.map((item) => <article className="appointment-history__item" key={item.id}><div className="appointment-history__date"><strong>{item.time}</strong><span>{item.date}</span></div><div className="appointment-history__main"><span className="appointment-history__icon"><Icon name="calendar"/></span><div><h3>{item.department}</h3><p>{item.id} · {item.paymentType}</p></div></div><Badge tone={item.status === "Đã xác nhận" ? "success" : "warning"}>{item.status}</Badge><Button variant="ghost" onClick={() => { setLookupAppointment(item); setSearched(true); setShowHistory(false); setState("ready"); }}>Chi tiết <Icon name="chevron" size={15}/></Button></article>)}</div><nav className="appointment-pagination" aria-label="Phân trang lịch sử đặt lịch"><Button type="button" variant="secondary" disabled={historyPage <= 1} onClick={() => void loadHistory(historyPage - 1)}><Icon name="chevron" size={15}/> Trước</Button><span><strong>{(historyPage - 1) * 5 + 1}–{Math.min(historyPage * 5, historyTotal)}</strong><small>trong {historyTotal} lịch</small></span><Button type="button" variant="secondary" disabled={historyPage >= historyTotalPages} onClick={() => void loadHistory(historyPage + 1)}>Sau <Icon name="chevron" size={15}/></Button></nav></>}</section>}
    {mode === "lookup" && searched && <section className="lookup-result portal-card" aria-live="polite">{state !== "ready" ? <StateView state={state} emptyText="Không tìm thấy lịch khám khớp với mã và số điện thoại." onRetry={() => setSearched(false)}/> : lookupAppointment && <><div className="result-top"><div><Badge tone={displayedAppointment.status === "Đã xác nhận" ? "success" : "warning"}><Icon name="check" size={13}/> {displayedAppointment.status}</Badge><h2>{displayedAppointment.department}</h2><p>Mã lịch hẹn: <strong>{displayedAppointment.id}</strong></p></div><span className="appointment-date"><strong>{displayedAppointment.time}</strong><small>{displayedAppointment.date}</small></span></div><dl className="appointment-details"><div><dt>Cơ sở khám</dt><dd><Icon name="map"/>{displayedAppointment.facility}</dd></div><div><dt>Bác sĩ dự kiến</dt><dd><Icon name="user"/>{displayedAppointment.doctor}</dd></div><div><dt>Hình thức</dt><dd><Icon name="file"/>{displayedAppointment.visitType} · {displayedAppointment.paymentType}</dd></div></dl><div className="result-actions"><Link className="button button--secondary" href="/procedures#dang-ky"><Icon name="file"/> Xem giấy tờ cần chuẩn bị</Link></div></>}</section>}
  </div>;
}

export function CheckInFlow({ appointment }: { appointment: Appointment }) {
  const [confirmed, setConfirmed] = useState(false);
  const [modal, setModal] = useState(false);
  return <div className="container checkin-layout"><section className="checkin-progress" aria-label="Tiến trình check-in"><div className="active"><span>1</span><strong>Xác nhận lịch hẹn</strong></div><i/><div><span>2</span><strong>Kiểm tra giấy tờ</strong></div><i/><div><span>3</span><strong>Hoàn tất</strong></div></section><section className="portal-card checkin-card"><div className="portal-card__heading"><span><Icon name="calendar"/></span><div><h2>Xác nhận lịch khám</h2><p>Vui lòng kiểm tra thông tin giả lập trước khi tiếp tục.</p></div><Badge tone="success">{appointment.status}</Badge></div><div className="checkin-appointment"><div className="date-block"><strong>{appointment.time}</strong><span>17</span><small>Tháng 07 · 2026</small></div><div><h3>{appointment.department}</h3><p><Icon name="map"/>{appointment.facility}</p><p><Icon name="user"/>{appointment.doctor}</p><div><Badge tone="info">{appointment.paymentType}</Badge><Badge>{appointment.visitType}</Badge></div></div></div><h3 className="subheading">Giấy tờ cần chuẩn bị</h3><div className="document-list">{appointment.documents.map((document) => <label key={document.label}><input type="checkbox" defaultChecked={document.ready}/><span><i><Icon name="check"/></i>{document.label}</span></label>)}</div><label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}/><span>Tôi xác nhận đây là lịch hẹn mô phỏng và không nhập dữ liệu thật.</span></label><div className="card-actions"><Button variant="secondary">Quay lại</Button><Button disabled={!confirmed} onClick={() => setModal(true)}>Xác nhận đã đến</Button></div></section><aside className="support-card"><Icon name="help"/><h2>Bạn cần hỗ trợ?</h2><p>Nhân viên tại quầy tiếp đón có thể hỗ trợ check-in và kiểm tra giấy tờ.</p><Button variant="secondary" icon="phone">Gọi quầy hỗ trợ</Button></aside>
    {modal && <div className="modal-layer" role="presentation"><button className="modal-backdrop" onClick={() => setModal(false)} aria-label="Đóng hộp thoại"/><section className="modal" role="dialog" aria-modal="true" aria-labelledby="checkin-success"><button className="icon-button modal-close" onClick={() => setModal(false)} aria-label="Đóng"><Icon name="close"/></button><span className="modal-success"><Icon name="check" size={34}/></span><h2 id="checkin-success">Check-in mô phỏng thành công</h2><p>Bạn đã được cấp số thứ tự giả lập <strong>A024</strong>. Không có dữ liệu nào được gửi đến bệnh viện.</p><div className="modal-queue"><small>Số thứ tự</small><strong>A024</strong><span>Quầy tiếp nhận số 03</span></div><Link href="/visit/VISIT-001" className="button button--primary">Xem hành trình khám <Icon name="arrow"/></Link></section></div>}
  </div>;
}

export function MedicationList({ medications }: { medications: Medication[] }) {
  const [state, setState] = useState<LoadState>("ready");
  const [responses, setResponses] = useState<Record<string, string>>({});
  return <div className="container medication-page"><div className="profile-summary"><div className="avatar">NA</div><div><span>Hồ sơ giả lập</span><h2>Nguyễn Văn An</h2><p>Mã người bệnh: BN-DEMO-0042</p></div><DemoStateControl state={state} setState={setState}/></div><div className="medication-overview"><div><Icon name="pill"/><span><strong>{medications.length} lịch nhắc</strong><small>Đang hoạt động trong prototype</small></span></div><div><Icon name="check"/><span><strong>5/7 đã ghi nhận</strong><small>Trong 7 ngày gần đây</small></span></div><div><Icon name="bell"/><span><strong>Nhắc tiếp theo 20:00</strong><small>Chỉ hiển thị trên giao diện</small></span></div></div>{state !== "ready" ? <StateView state={state} emptyText="Chưa có lịch nhắc thuốc hôm nay." onRetry={() => setState("ready")}/> : <section><div className="content-heading"><div><h2>Lịch nhắc hôm nay</h2><p>Thứ Sáu, 17 tháng 07 năm 2026</p></div><Badge tone="info">Dữ liệu giả lập</Badge></div><div className="medication-list">{medications.map((medication) => <article className="medication-card" key={medication.id}><div className="med-time"><strong>{medication.time}</strong><span>{medication.status}</span></div><div className="med-main"><div className="med-title"><span><Icon name="pill"/></span><div><h3>{medication.name}</h3><p>{medication.dosage} · {medication.schedule}</p></div><Badge tone={medication.status === "Đã ghi nhận" ? "success" : medication.status === "Sắp đến giờ" ? "info" : "warning"}>{responses[medication.id] || medication.status}</Badge></div><div className="med-info"><p><strong>Hướng dẫn đã duyệt</strong>{medication.instruction}</p><p><strong>Thời gian áp dụng</strong>{medication.period}</p><p><strong>Người xác nhận</strong>{medication.approvedBy}</p></div><div className="med-actions" aria-label={`Ghi nhận cho ${medication.name}`}><span>Phản hồi:</span>{["Đã uống", "Chưa uống", "Không uống được", "Hết thuốc", "Có triệu chứng"].map((response) => <button className={responses[medication.id] === response ? "active" : ""} key={response} onClick={() => setResponses({ ...responses, [medication.id]: response })}>{response}</button>)}</div></div></article>)}</div><div className="medical-disclaimer"><Icon name="alert"/><p><strong>Prototype không đưa ra chỉ định y khoa</strong><span>Không tự thay đổi tên thuốc, liều hoặc giờ dùng. Nếu có dấu hiệu bất thường, gọi cơ sở y tế; trường hợp khẩn cấp gọi 115.</span></p></div></section>}</div>;
}

export function PatientProfile() {
  const [tab, setTab] = useState("Tổng quan");
  return <div className="container profile-page"><section className="profile-hero"><div className="avatar avatar--large">NA</div><div><Badge tone="info">Hồ sơ giả lập</Badge><h1>Nguyễn Văn An</h1><p>Mã người bệnh: BN-DEMO-0042 · 58 tuổi</p></div><Button variant="secondary" icon="settings">Cập nhật thông tin</Button></section><nav className="profile-tabs" aria-label="Nội dung hồ sơ">{["Tổng quan", "Lịch khám", "Thuốc", "Tài liệu", "Đồng thuận"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>{tab !== "Tổng quan" ? <section className="portal-card tab-placeholder"><Icon name={tab === "Thuốc" ? "pill" : "file"}/><h2>{tab}</h2><p>Nội dung chi tiết là placeholder trong iteration này.</p>{tab === "Thuốc" && <Link href="/patient/medications" className="button button--primary">Mở lịch nhắc thuốc</Link>}</section> : <div className="profile-grid"><section className="portal-card"><div className="content-heading"><div><h2>Thông tin liên hệ</h2><p>Dữ liệu hư cấu, chỉ dùng minh họa.</p></div><button className="text-button">Chỉnh sửa</button></div><dl className="profile-details"><div><dt>Số điện thoại</dt><dd>0987 000 042</dd></div><div><dt>Ngày sinh</dt><dd>12/04/1968</dd></div><div><dt>Địa chỉ</dt><dd>Phường Cửa Nam, Hà Nội</dd></div><div><dt>Kênh ưu tiên</dt><dd>Thông báo trong website</dd></div></dl></section><section className="portal-card"><div className="content-heading"><div><h2>Lịch khám tiếp theo</h2><p>Đã xác nhận</p></div><Icon name="calendar"/></div><div className="next-appointment"><strong>09:30</strong><span><b>17/07/2026</b>Phòng khám Tim mạch tổng quát</span></div><Link href="/appointments">Xem chi tiết <Icon name="arrow" size={16}/></Link></section><section className="portal-card current-visit-card"><div className="content-heading"><div><h2>Hành trình hiện tại</h2><p>Cập nhật lúc 10:24</p></div><Badge tone="warning">Đang diễn ra</Badge></div><div className="profile-queue"><span><small>Số thứ tự</small><strong>A024</strong></span><span><small>Bước hiện tại</small><strong>Chờ thanh toán</strong></span></div><Link href="/visit/VISIT-001" className="button button--primary">Theo dõi lượt khám</Link></section><section className="portal-card"><div className="content-heading"><div><h2>Nhắc thuốc hôm nay</h2><p>3 lịch nhắc đang hoạt động</p></div><Icon name="pill"/></div><div className="reminder-mini"><span>08:00</span><p><strong>Cardioval 5 mg</strong><small>Sắp đến giờ · Dữ liệu giả</small></p></div><Link href="/patient/medications">Xem lịch nhắc <Icon name="arrow" size={16}/></Link></section></div>}</div>;
}
