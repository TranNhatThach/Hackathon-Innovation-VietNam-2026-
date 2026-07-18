"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { Badge, Button, StateView } from "@/components/shared/ui";
import { getApiBaseUrl } from "@/lib/api";

type Doctor = { doctor_code: string; display_name: string; department: string; facility: string; is_active: boolean; created_at: string };

export function DoctorDirectory() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch(`${getApiBaseUrl()}/api/doctors`, { cache: "no-store" }); if (!response.ok) throw new Error(); setDoctors(await response.json() as Doctor[]); }
    catch { setError("Không thể tải danh sách bác sĩ."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => { const value = query.toLowerCase().trim(); return value ? doctors.filter((item) => `${item.display_name} ${item.doctor_code} ${item.department}`.toLowerCase().includes(value)) : doctors; }, [doctors, query]);

  const createDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/doctors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: form.get("display_name"), department: form.get("department"), facility: form.get("facility") }) });
      if (!response.ok) { const detail = await response.json().catch(() => null) as { detail?: string } | null; throw new Error(detail?.detail ?? "Không thể thêm bác sĩ"); }
      setShowForm(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thêm bác sĩ"); }
    finally { setSaving(false); }
  };

  const toggle = async (doctor: Doctor) => {
    const response = await fetch(`${getApiBaseUrl()}/api/doctors/${doctor.doctor_code}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !doctor.is_active }) });
    if (response.ok) setDoctors((items) => items.map((item) => item.doctor_code === doctor.doctor_code ? { ...item, is_active: !item.is_active } : item));
  };

  return <><div className="staff-page-heading"><div><span className="breadcrumb">Nhân sự <Icon name="chevron" size={13}/> Bác sĩ</span><h1>Quản lý bác sĩ</h1><p>Danh sách này được sử dụng trực tiếp khi phân công lịch khám.</p></div><Button icon="user" onClick={() => setShowForm(true)}>Thêm bác sĩ</Button></div>
    <section className="metric-strip"><div><span className="metric-icon metric-icon--blue"><Icon name="users"/></span><p><small>Tổng bác sĩ</small><strong>{doctors.length}</strong><em>Trong PostgreSQL</em></p></div><div><span className="metric-icon metric-icon--green"><Icon name="check"/></span><p><small>Đang hoạt động</small><strong>{doctors.filter((item) => item.is_active).length}</strong><em>Có thể nhận lịch</em></p></div></section>
    <section className="filter-toolbar"><label className="board-search"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã bác sĩ, chuyên khoa..."/></label><span className="ops-result-count">{filtered.length} bác sĩ</span></section>
    {error && <div className="workflow-feedback" role="alert"><Icon name="alert"/><span>{error}</span><button onClick={() => setError("")}><Icon name="close"/></button></div>}
    {loading ? <StateView state="loading" emptyText="Đang tải..."/> : <section className="doctor-grid">{filtered.map((doctor) => <article className="doctor-admin-card" key={doctor.doctor_code}><div className="doctor-admin-avatar">{doctor.display_name.replace("BS. ", "").split(" ").slice(-2).map((part) => part[0]).join("")}</div><div><Badge tone={doctor.is_active ? "success" : "neutral"}>{doctor.is_active ? "Đang hoạt động" : "Tạm ngừng"}</Badge><h2>{doctor.display_name}</h2><p>{doctor.department}</p><small>{doctor.doctor_code} · {doctor.facility}</small></div><Button variant="secondary" onClick={() => void toggle(doctor)}>{doctor.is_active ? "Tạm ngừng" : "Kích hoạt"}</Button></article>)}</section>}
    {showForm && <><button className="detail-scrim" aria-label="Đóng" onClick={() => setShowForm(false)}/><aside className="case-detail operations-quickview"><header><strong>Thêm bác sĩ mới</strong><button className="icon-button" onClick={() => setShowForm(false)}><Icon name="close"/></button></header><div className="case-detail__body"><form className="doctor-create-form" onSubmit={createDoctor}><label><span>Họ và tên bác sĩ</span><input name="display_name" required minLength={2} placeholder="Ví dụ: BS. Nguyễn Minh Anh" autoFocus/></label><label><span>Chuyên khoa</span><input name="department" required minLength={2} placeholder="Ví dụ: Tim mạch tổng quát"/></label><label><span>Cơ sở</span><select name="facility" defaultValue="Bệnh viện Tim Hà Nội - Cơ sở 1"><option>Bệnh viện Tim Hà Nội - Cơ sở 1</option><option>Bệnh viện Tim Hà Nội - Cơ sở 2</option></select></label><Button type="submit" icon="check" disabled={saving}>{saving ? "Đang lưu..." : "Lưu bác sĩ"}</Button></form></div></aside></>}
  </>;
}
