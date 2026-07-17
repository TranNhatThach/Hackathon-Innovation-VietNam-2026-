"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Button, DemoStateControl, StateView } from "@/components/ui";
import { dashboardMetrics, humanCases } from "@/lib/mock-data";
import type { LoadState, Priority } from "@/types";

const tone = (priority: Priority) => priority === "P0" ? "danger" : priority === "P1" ? "warning" : "neutral";

export function HumanCaseDashboard() {
  const [state, setState] = useState<LoadState>("ready");
  const [priority, setPriority] = useState<Priority | "ALL">("ALL");
  const [selected, setSelected] = useState(humanCases[0]?.id);
  const cases = useMemo(() => humanCases.filter((item) => priority === "ALL" || item.priority === priority), [priority]);
  const active = cases.find((item) => item.id === selected) ?? cases[0];
  return <>
    <div className="workspace-heading"><div><span className="workspace-kicker">TRUNG TÂM ĐIỀU PHỐI</span><h1>Can thiệp con người</h1><p>Ưu tiên theo mức độ và thời hạn xử lý</p></div><div className="workspace-actions"><DemoStateControl state={state} setState={setState}/><Button icon="user">Phân công case</Button></div></div>
    <section className="metric-grid" aria-label="Chỉ số case">{dashboardMetrics.map((metric) => <article className={`metric-card metric-card--${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}</section>
    <section className="staff-filter-bar" aria-label="Bộ lọc case"><label><span className="sr-only">Lọc theo ưu tiên</span><select value={priority} onChange={(event) => setPriority(event.target.value as Priority | "ALL")}><option value="ALL">Tất cả mức ưu tiên</option><option value="P0">P0 · Khẩn cấp</option><option value="P1">P1 · Lâm sàng</option><option value="P2">P2 · Hỗ trợ</option><option value="P3">P3 · Thường</option></select></label><label><span className="sr-only">Lọc theo chủ sở hữu</span><select><option>Tất cả người phụ trách</option><option>Chưa phân công</option><option>Đã phân công</option></select></label><Button variant="ghost" icon="filter">Bộ lọc khác</Button><span className="filter-count">Cập nhật 10:24 · Mock API</span></section>
    {state !== "ready" ? <StateView state={state} emptyText="Không có case cần xử lý." onRetry={() => setState("ready")}/> : cases.length === 0 ? <StateView state="empty" emptyText="Không có case ở mức ưu tiên này."/> : <div className="case-workspace">
      <section className="case-list" aria-label="Danh sách case"><header><strong>{cases.length} case</strong><span>Sắp xếp: SLA gần nhất</span></header>{cases.map((item) => <button className={selected === item.id ? "case-row is-active" : "case-row"} key={item.id} onClick={() => setSelected(item.id)}><span className={`priority-block priority-block--${item.priority.toLowerCase()}`}>{item.priority}</span><span className="case-row__main"><span><strong>{item.id}</strong><Badge tone={tone(item.priority)}>{item.status}</Badge></span><b>{item.type}</b><small>{item.patientName} · Tạo lúc {item.createdAt}</small><span className="sla-line"><Icon name="clock" size={14}/> SLA {item.slaDue}<em>{item.owner ?? "Chưa phân công"}</em></span></span><Icon name="chevron"/></button>)}</section>
      {active && <aside className="case-detail" aria-label={`Chi tiết ${active.id}`}><header><div><span><Badge tone={tone(active.priority)}>{active.priority}</Badge><small>{active.id}</small></span><h2>{active.type}</h2></div><button className="icon-button" aria-label="Tùy chọn case"><Icon name="more"/></button></header><div className="p0-warning"><Icon name="alert"/><div><strong>{active.priority === "P0" ? "Cần xác nhận ngay" : "Cần xử lý trong SLA"}</strong><p>Prototype không tự đưa ra quyết định y khoa hoặc liên hệ bên ngoài.</p></div></div><section><h3>Lý do kích hoạt</h3><blockquote>“{active.trigger}”</blockquote><p className="source-line">Nguồn: Form hỗ trợ trong website · {active.createdAt}</p></section><section><h3>Thông tin tối thiểu</h3><dl className="detail-list"><div><dt>Người bệnh</dt><dd>{active.patientName}</dd></div><div><dt>Lượt khám</dt><dd>VISIT-001 · A024</dd></div><div><dt>Bước hiện tại</dt><dd>Chờ bác sĩ · Phòng 201</dd></div><div><dt>Người phụ trách</dt><dd>{active.owner ?? "Chưa phân công"}</dd></div></dl></section><section><h3>Hành động nhân viên</h3><div className="case-actions"><Button icon="phone">Gọi người bệnh</Button><Button variant="secondary" icon="user">Phân công</Button><Button variant="secondary" icon="arrow">Chuyển cấp</Button></div><small className="audit-note"><Icon name="shield" size={14}/> Mọi hành động ghi sẽ cần xác nhận và audit trong sản phẩm thật.</small></section></aside>}
    </div>}
  </>;
}
