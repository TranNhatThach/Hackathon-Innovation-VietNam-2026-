"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { Badge, Button, StateView } from "@/components/shared/ui";

type StaffAppointment = {
  appointment_code: string;
  patient_code: string;
  patient_name: string;
  phone: string | null;
  scheduled_at: string;
  created_at: string;
  status: string;
  facility: string;
  department: string;
  doctor: string | null;
  visit_type: string;
  payment_type: string;
};
type DoctorOption = { name: string; departments: string[] };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function OperationsBoard() {
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StaffAppointment | null>(null);
  const [doctor, setDoctor] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorQuery, setDoctorQuery] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [appointmentsResponse, doctorsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/appointments/staff`, { cache: "no-store" }),
        fetch(`${apiUrl}/api/doctors`, { cache: "no-store" }),
      ]);
      if (!appointmentsResponse.ok || !doctorsResponse.ok) throw new Error("Không tải được dữ liệu phân công");
      setAppointments(await appointmentsResponse.json() as StaffAppointment[]);
      const doctorRows = await doctorsResponse.json() as Array<{ display_name: string; department: string; is_active: boolean }>;
      const grouped = new Map<string, Set<string>>();
      doctorRows.filter((item) => item.is_active).forEach((item) => { if (!grouped.has(item.display_name)) grouped.set(item.display_name, new Set()); grouped.get(item.display_name)?.add(item.department); });
      setDoctors(Array.from(grouped, ([name, departments]) => ({ name, departments: Array.from(departments) })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAppointments(); }, [loadAppointments]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return appointments;
    return appointments.filter((item) =>
      `${item.patient_name} ${item.phone ?? ""} ${item.appointment_code} ${item.department}`
        .toLowerCase().includes(normalized),
    );
  }, [appointments, query]);

  const pending = appointments.filter((item) => item.status === "Chờ xác nhận").length;
  const today = new Date().toDateString();
  const createdToday = appointments.filter((item) => new Date(item.created_at).toDateString() === today).length;
  const visibleDoctors = useMemo(() => {
    const value = doctorQuery.trim().toLowerCase();
    const filteredDoctors = value ? doctors.filter((item) => `${item.name} ${item.departments.join(" ")}`.toLowerCase().includes(value)) : doctors;
    if (!selected) return filteredDoctors;
    return [...filteredDoctors].sort((a, b) => Number(b.departments.includes(selected.department)) - Number(a.departments.includes(selected.department)));
  }, [doctorQuery, doctors, selected]);

  const assignDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setAssigning(true);
    setAssignmentError("");
    try {
      const response = await fetch(`${apiUrl}/api/appointments/${encodeURIComponent(selected.appointment_code)}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor }),
      });
      if (!response.ok) throw new Error("Không thể phân công bác sĩ");
      const updated = await response.json() as StaffAppointment;
      setAppointments((items) => items.map((item) => item.appointment_code === selected.appointment_code ? { ...item, doctor: updated.doctor, status: updated.status } : item));
      setSelected(null);
      setDoctor("");
    } catch {
      setAssignmentError("Không thể lưu phân công. Vui lòng thử lại.");
    } finally {
      setAssigning(false);
    }
  };

  return <>
    <div className="staff-page-heading">
      <div>
        <span className="breadcrumb">Vận hành <Icon name="chevron" size={13}/> Tiếp nhận lịch khám</span>
        <h1>Yêu cầu đặt lịch từ người bệnh</h1>
        <p>Dữ liệu được lấy trực tiếp từ yêu cầu người bệnh gửi trên cổng đặt lịch.</p>
      </div>
      <div className="heading-actions"><Button variant="secondary" icon="refresh" onClick={() => void loadAppointments()} disabled={loading}>Làm mới</Button></div>
    </div>

    <section className="metric-strip" aria-label="Tổng quan lịch khám">
      <div><span className="metric-icon metric-icon--blue"><Icon name="calendar"/></span><p><small>Tổng yêu cầu thật</small><strong>{appointments.length}</strong><em>Không bao gồm dữ liệu demo</em></p></div>
      <div><span className="metric-icon metric-icon--amber"><Icon name="clock"/></span><p><small>Chờ xác nhận</small><strong>{pending}</strong><em>Cần nhân viên tiếp nhận</em></p></div>
      <div><span className="metric-icon metric-icon--green"><Icon name="check"/></span><p><small>Gửi hôm nay</small><strong>{createdToday}</strong><em>Cập nhật từ PostgreSQL</em></p></div>
    </section>

    <section className="filter-toolbar" aria-label="Tìm lịch hẹn">
      <label className="board-search"><Icon name="search" size={17}/><span className="sr-only">Tìm lịch hẹn</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, số điện thoại hoặc mã lịch"/></label>
      <span className="ops-result-count">{filtered.length} yêu cầu</span>
    </section>

    {loading ? <StateView state="loading" emptyText="Đang tải lịch hẹn..."/> : error ? <StateView state="error" emptyText="Không thể kết nối hệ thống lịch hẹn." onRetry={() => void loadAppointments()}/> : filtered.length === 0 ? <StateView state="empty" emptyText={appointments.length ? "Không tìm thấy lịch phù hợp." : "Chưa có người bệnh gửi yêu cầu đặt lịch."}/> :
      <section className="kanban-board kanban-board--list" aria-label="Danh sách lịch hẹn">
        <article className="kanban-column">
          <header className="column-heading column-heading--blue"><span>01</span>Lịch mới tiếp nhận<b>{filtered.length}</b></header>
          <div className="column-body">{filtered.map((item) => {
            const scheduled = new Date(item.scheduled_at);
            return <article className="visit-card" key={item.appointment_code}>
              <header><strong>{item.appointment_code}</strong><Badge tone={item.status === "Đã xác nhận" ? "success" : "warning"}>{item.status}</Badge></header>
              <h3>{item.patient_name}</h3>
              <dl>
                <div><dt><Icon name="phone" size={13}/>Số điện thoại</dt><dd>{item.phone ?? "Chưa có"}</dd></div>
                <div><dt><Icon name="calendar" size={13}/>Lịch mong muốn</dt><dd>{scheduled.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</dd></div>
                <div><dt><Icon name="file" size={13}/>Nhu cầu khám</dt><dd>{item.department}</dd></div>
                <div><dt><Icon name="shield" size={13}/>Hình thức</dt><dd>{item.payment_type}</dd></div>
              </dl>
              {item.doctor && <div className="visit-tags"><Badge tone="info"><Icon name="user" size={13}/> {item.doctor}</Badge></div>}
              <footer><span>Gửi lúc <strong>{new Date(item.created_at).toLocaleString("vi-VN")}</strong></span><button onClick={() => { setSelected(item); setDoctor(item.doctor ?? ""); setDoctorQuery(""); setAssignmentError(""); }}>{item.doctor ? "Đổi bác sĩ" : "Phân công"} <Icon name="arrow" size={14}/></button></footer>
            </article>;
          })}</div>
        </article>
      </section>}

    {selected && <><button className="detail-scrim" aria-label="Đóng phân công" onClick={() => setSelected(null)}/><aside className="case-detail operations-quickview" aria-label={`Phân công lịch ${selected.appointment_code}`}>
      <header><div><Badge tone="warning">{selected.status}</Badge><strong>{selected.appointment_code}</strong></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Đóng"><Icon name="close"/></button></header>
      <div className="case-detail__body"><span className="eyebrow">PHÂN CÔNG BÁC SĨ</span><h2>{selected.patient_name}</h2><p>{selected.department}</p>
        <dl><div><dt>Ngày giờ khám</dt><dd>{new Date(selected.scheduled_at).toLocaleString("vi-VN")}</dd></div><div><dt>Số điện thoại</dt><dd>{selected.phone ?? "Chưa có"}</dd></div><div><dt>Hình thức</dt><dd>{selected.payment_type}</dd></div></dl>
        <form className="assignment-form" onSubmit={assignDoctor}><fieldset><legend>Chọn bác sĩ phụ trách</legend><label className="doctor-search"><Icon name="search" size={16}/><span className="sr-only">Tìm bác sĩ</span><input value={doctorQuery} onChange={(event) => setDoctorQuery(event.target.value)} placeholder="Tìm theo tên hoặc chuyên khoa..."/></label><div className="doctor-picker">{visibleDoctors.map((item) => { const active = doctor === item.name; const suitable = item.departments.includes(selected.department); return <label className={active ? "doctor-option is-selected" : "doctor-option"} key={item.name}><input type="radio" name="doctor" value={item.name} checked={active} onChange={() => setDoctor(item.name)}/><span className="doctor-option__avatar">{item.name.replace("BS. ", "").split(" ").slice(-2).map((part) => part[0]).join("")}</span><span className="doctor-option__info"><strong>{item.name}{suitable && <em>Phù hợp</em>}</strong><small>{item.departments.length ? item.departments.join(", ") : "Chuyên khoa chưa cập nhật"}</small></span><span className="doctor-option__check"><Icon name="check" size={15}/></span></label>; })}{visibleDoctors.length === 0 && <div className="doctor-picker__empty"><Icon name="search"/><span>Không tìm thấy bác sĩ phù hợp</span></div>}</div><small className="doctor-picker__count"><Icon name="users" size={14}/> Hiển thị {visibleDoctors.length} / {doctors.length} bác sĩ</small></fieldset>{assignmentError && <p className="form-note" role="alert"><Icon name="alert" size={16}/> {assignmentError}</p>}<Button type="submit" icon="check" disabled={assigning || !doctor}>{assigning ? "Đang lưu..." : "Xác nhận phân công"}</Button></form>
      </div>
    </aside></>}
  </>;
}
