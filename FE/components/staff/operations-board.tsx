"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Badge, Button, DemoStateControl, StateView } from "@/components/shared/ui";
import { kanbanColumns, visits } from "@/lib/mock-data";
import type { LoadState, Visit, VisitStage } from "@/types";

type ViewMode = "board" | "list";

export function OperationsBoard() {
  const [state, setState] = useState<LoadState>("ready");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<VisitStage | "ALL">("ALL");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("board");
  const [selected, setSelected] = useState<Visit | null>(null);
  const [feedback, setFeedback] = useState("");

  const filtered = useMemo(() => visits.filter((visit) => {
    const matchesSearch = `${visit.patientName} ${visit.queueNumber}`.toLowerCase().includes(query.toLowerCase());
    const matchesStage = stage === "ALL" || visit.stage === stage;
    const needsAttention = !attentionOnly || visit.alerts.length > 0 || visit.waitMinutes > 30;
    return matchesSearch && matchesStage && needsAttention;
  }), [attentionOnly, query, stage]);

  const overThirty = useMemo(() => visits.filter((visit) => visit.waitMinutes > 30).length, []);
  const bhytIssues = useMemo(() => visits.filter((visit) => visit.paymentType === "BHYT" && visit.paymentStatus === "Chờ thanh toán").length, []);
  const attentionCount = useMemo(() => visits.filter((visit) => visit.alerts.length > 0 || visit.waitMinutes > 30).length, []);

  const focusBottleneck = () => {
    setStage("WAITING_DOCTOR");
    setAttentionOnly(false);
    setFeedback("Đã lọc các lượt đang chờ bác sĩ.");
  };

  const mockAction = (message: string) => setFeedback(`${message} · Đã ghi nhận trong phiên mô phỏng, chưa gửi đến hệ thống bệnh viện.`);

  return <>
    <div className="staff-page-heading">
      <div><span className="breadcrumb">Vận hành <Icon name="chevron" size={13}/> Hành trình hôm nay</span><h1>Điều phối hành trình người bệnh</h1><p>Ưu tiên lượt cần can thiệp, mở ngữ cảnh và xử lý bước tiếp theo.</p></div>
      <div className="heading-actions"><DemoStateControl state={state} setState={setState}/><Button variant="secondary" icon="refresh" onClick={() => mockAction("Dữ liệu đã được làm mới lúc 10:24")}>Làm mới</Button></div>
    </div>

    <section className="metric-strip" aria-label="Tổng quan vận hành">
      <div><span className="metric-icon metric-icon--blue"><Icon name="users"/></span><p><small>Đang trong hành trình</small><strong>{visits.length}</strong><em>Cơ sở 1 · Hôm nay</em></p></div>
      <div><span className="metric-icon metric-icon--amber"><Icon name="clock"/></span><p><small>Chờ trên 30 phút</small><strong>{overThirty}</strong><em>Cần kiểm tra trạng thái</em></p></div>
      <div><span className="metric-icon metric-icon--red"><Icon name="alert"/></span><p><small>Yêu cầu P0 đang mở</small><strong>1</strong><em>Chưa có người nhận</em></p></div>
      <div><span className="metric-icon metric-icon--green"><Icon name="shield"/></span><p><small>Vướng BHYT / phí</small><strong>{bhytIssues}</strong><em>Đang chờ xử lý</em></p></div>
    </section>
 
    <section className="bottleneck-banner" aria-label="Cảnh báo điểm nghẽn"><Icon name="alert"/><div><strong>Điểm nghẽn: khu vực chờ bác sĩ</strong><p>3 lượt có nguy cơ vượt ngưỡng mô phỏng. Hãy xác minh vị trí người bệnh trước khi điều phối.</p></div><Button variant="secondary" onClick={focusBottleneck}>Xem lượt liên quan</Button><Link href="/staff/human-in-loop" className="button button--ghost">Mở hàng đợi hỗ trợ</Link></section>

    <section className="filter-toolbar" aria-label="Bộ lọc bảng vận hành">
      <label className="board-search"><Icon name="search" size={17}/><span className="sr-only">Tìm trong bảng vận hành</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên rút gọn hoặc số thứ tự"/></label>
      <label><span className="sr-only">Giai đoạn</span><select value={stage} onChange={(event) => setStage(event.target.value as VisitStage | "ALL")}><option value="ALL">Tất cả giai đoạn</option>{kanbanColumns.map((column) => <option value={column.id} key={column.id}>{column.shortLabel}</option>)}</select></label>
      <button className={attentionOnly ? "filter-button is-active" : "filter-button"} aria-pressed={attentionOnly} onClick={() => setAttentionOnly((value) => !value)}><Icon name="alert" size={15}/> Cần chú ý <b>{attentionCount}</b></button>
      {(query || stage !== "ALL" || attentionOnly) && <button className="filter-button" onClick={() => { setQuery(""); setStage("ALL"); setAttentionOnly(false); }}>Xóa bộ lọc</button>}
      <span className="ops-result-count">{filtered.length} lượt</span>
      <div className="view-toggle" aria-label="Kiểu hiển thị"><button className={view === "board" ? "active" : ""} aria-label="Xem dạng bảng" aria-pressed={view === "board"} onClick={() => setView("board")}><Icon name="kanban"/></button><button className={view === "list" ? "active" : ""} aria-label="Xem dạng danh sách" aria-pressed={view === "list"} onClick={() => setView("list")}><Icon name="file"/></button></div>
    </section>

    {feedback && <div className="workflow-feedback" role="status"><Icon name="check"/><span>{feedback}</span><button aria-label="Đóng thông báo" onClick={() => setFeedback("")}><Icon name="close" size={15}/></button></div>}

    {state !== "ready" ? <StateView state={state} emptyText="Chưa có bệnh nhân trong ca trực này." onRetry={() => setState("ready")}/> : filtered.length === 0 ? <StateView state="empty" emptyText="Không tìm thấy lượt khám phù hợp."/> :
      <section className={view === "list" ? "kanban-board kanban-board--list" : "kanban-board"} aria-label="Hành trình người bệnh">
        {kanbanColumns.map((column, index) => {
          const cards = filtered.filter((visit) => visit.stage === column.id);
          const headingTone = ["", "column-heading--violet", "column-heading--amber", "column-heading--blue", "column-heading--cyan", "column-heading--green"][index];
          return <article className="kanban-column" key={column.id}>
            <header className={`column-heading ${headingTone}`}><span>{String(index + 1).padStart(2, "0")}</span>{column.shortLabel}<b aria-label={`${cards.length} lượt`}>{cards.length}</b></header>
            <div className="column-body">{cards.length === 0 ? <div className="column-empty"><Icon name="inbox"/><span>Không có lượt ở bước này</span></div> : cards.map((visit) => <article className={visit.alerts.length || visit.waitMinutes > 30 ? "visit-card visit-card--alert" : "visit-card"} key={visit.id}>
              <header><strong>{visit.queueNumber}</strong><Badge tone={visit.priority === "Ưu tiên" ? "warning" : "neutral"}>{visit.priority}</Badge><button onClick={() => setSelected(visit)} aria-label={`Mở nhanh lượt ${visit.queueNumber}`}><Icon name="more" size={16}/></button></header>
              <h3>{visit.patientName}</h3>
              <dl><div><dt><Icon name="clock" size={13}/>Thời gian chờ</dt><dd className={visit.waitMinutes > 30 ? "wait-high" : ""}>{visit.waitMinutes} phút</dd></div><div><dt><Icon name="map" size={13}/>Vị trí</dt><dd>{visit.room ?? "Chưa phân"}</dd></div><div><dt><Icon name="file" size={13}/>Thanh toán</dt><dd>{visit.paymentType}</dd></div></dl>
              <div className="visit-tags"><Badge tone={visit.paymentStatus === "Đã thanh toán" ? "success" : "warning"}>{visit.paymentStatus}</Badge>{visit.doctor && <Badge tone="info">{visit.doctor}</Badge>}</div>
              {visit.alerts.map((alert) => <div className="card-alert" key={alert}><Icon name="alert" size={13}/>{alert}</div>)}
              <footer><span>Tiếp theo: <strong>{visit.nextAction}</strong></span><button onClick={() => setSelected(visit)}>Xử lý <Icon name="arrow" size={14}/></button></footer>
            </article>)}</div>
          </article>;
        })}
      </section>}
    <p className="mock-footnote"><Icon name="shield" size={15}/> Mọi chuyển bước cần xác nhận, đúng quyền và được ghi vết trong sản phẩm thật.</p>

    {selected && <><button className="detail-scrim" aria-label="Đóng xem nhanh lượt khám" onClick={() => setSelected(null)}/><aside className="case-detail operations-quickview" aria-label={`Xem nhanh lượt ${selected.queueNumber}`}><header><div><Badge tone={selected.alerts.length ? "warning" : "info"}>{selected.stageLabel}</Badge><strong>{selected.queueNumber}</strong></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Đóng"><Icon name="close"/></button></header><div className="case-detail__body"><span className="eyebrow">NGỮ CẢNH LƯỢT KHÁM</span><h2>{selected.patientName}</h2><p>Dữ liệu tối thiểu để điều phối. Không hiển thị hồ sơ lâm sàng.</p>{selected.alerts.map((alert) => <div className="quickview-alert" key={alert}><Icon name="alert"/><span><strong>{alert}</strong><small>Kiểm tra trạng thái thực tế trước khi thao tác.</small></span></div>)}<dl><div><dt>Bước hiện tại</dt><dd>{selected.stageLabel}</dd></div><div><dt>Đã ở bước này</dt><dd>{selected.waitMinutes} phút</dd></div><div><dt>Phòng / khu vực</dt><dd>{selected.room ?? "Chưa phân"}</dd></div><div><dt>Bác sĩ</dt><dd>{selected.doctor ?? "Chưa phân"}</dd></div><div><dt>BHYT / dịch vụ</dt><dd>{selected.paymentType} · {selected.paymentStatus}</dd></div></dl><div className="case-context"><Icon name="route"/><p><strong>Hành động được đề xuất</strong><span>{selected.nextAction}</span></p></div>{feedback && <div className="drawer-feedback" role="status"><Icon name="check" size={16}/>{feedback}</div>}<h3>Thực hiện bước tiếp theo</h3><div className="detail-actions"><Button onClick={() => mockAction(`Đã nhận xử lý lượt ${selected.queueNumber}`)} icon="user">Nhận xử lý</Button><Button variant="secondary" onClick={() => mockAction(`Đã gửi mẫu thông báo cho lượt ${selected.queueNumber}`)} icon="message">Gửi tin nhắn mẫu</Button><Button variant="secondary" onClick={() => mockAction(`Đã tạo yêu cầu xác nhận chuyển bước cho ${selected.queueNumber}`)} icon="route">Yêu cầu chuyển bước</Button><Link href="/staff/human-in-loop" className="button button--ghost"><Icon name="help"/> Tạo / xem human case</Link></div><small className="quickview-note">Prototype không tự chuyển giai đoạn hoặc ghi dữ liệu bệnh viện.</small></div></aside></>}
  </>;
}
