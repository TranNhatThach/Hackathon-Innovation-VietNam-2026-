"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Badge, Button, DemoStateControl, StateView } from "@/components/shared/ui";
import type { HumanCase, LoadState, Priority } from "@/types";
import { getApiBaseUrl } from "@/lib/api";

type Scope = "all" | "mine" | "unassigned";
type SlaFilter = "all" | "soon" | "overdue";
const priorityTone: Record<Priority, "danger" | "warning" | "info" | "neutral"> = { P0: "danger", P1: "warning", P2: "info", P3: "neutral" };

export function HumanLoopDashboard({ cases: initialCases }: { cases: HumanCase[] }) {
  const [items, setItems] = useState<HumanCase[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [scope, setScope] = useState<Scope>("all");
  const [sla, setSla] = useState<SlaFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const fetchCases = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/human-cases`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch human cases");
      const data = await response.json();
      
      const mapped: HumanCase[] = data.map((c: any) => {
        let p: Priority = "P2";
        if (c.priority === "HIGH" || c.priority === "P0") p = "P0";
        else if (c.priority === "P1") p = "P1";
        else if (c.priority === "P3") p = "P3";

        let s: any = "Mở";
        if (c.status === "RESOLVED") s = "Đã giải quyết";
        else if (c.status === "IN_PROGRESS") s = "Đã phân công";

        const createdDate = new Date(c.created_at);
        const createdAtStr = createdDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

        const slaDate = new Date(c.sla_due_at);
        const slaDueStr = slaDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

        return {
          id: c.case_code,
          patientName: c.patient ? c.patient.display_name : "Ẩn danh",
          type: c.case_type || "Hỗ trợ y tế",
          trigger: c.trigger || "",
          priority: p,
          createdAt: createdAtStr,
          slaDue: slaDueStr,
          owner: c.owner,
          status: s,
          slaDueAt: c.sla_due_at,
        };
      });

      setItems(mapped);
      setState(mapped.length === 0 ? "empty" : "ready");
    } catch (err) {
      console.error("Error fetching human cases from backend:", err);
      setState("error");
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const priorityMatch = priority === "all" || item.priority === priority;
    const scopeMatch = scope === "all" || (scope === "mine" ? item.owner === "Lan Anh" : item.owner === null);
    
    // SLA matching: compare dynamically using slaDueAt and system time
    let slaMatch = true;
    if (sla !== "all" && item.slaDueAt) {
      const now = new Date().getTime();
      const dueTime = new Date(item.slaDueAt).getTime();
      const isOverdue = dueTime < now;
      const isSoon = !isOverdue && (dueTime - now) <= 30 * 60 * 1000; // within 30 minutes
      slaMatch = sla === "overdue" ? isOverdue : isSoon;
    }
    
    return priorityMatch && scopeMatch && slaMatch;
  }), [items, priority, scope, sla]);

  const openCasesCount = useMemo(() => items.filter((item) => item.status !== "Đã giải quyết").length, [items]);
  const unassignedCasesCount = useMemo(() => items.filter((item) => !item.owner).length, [items]);
  const p0UnassignedCount = useMemo(() => items.filter((item) => item.priority === "P0" && !item.owner).length, [items]);
  const resolvedCasesCount = useMemo(() => items.filter((item) => item.status === "Đã giải quyết").length, [items]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const mineCount = useMemo(() => items.filter((item) => item.owner === "Lan Anh").length, [items]);

  const updateCase = async (id: string, patch: Partial<HumanCase>, message: string) => {
    try {
      const body: any = {};
      if (patch.status) {
        if (patch.status === "Đã giải quyết") body.status = "RESOLVED";
        else if (patch.status === "Đã phân công") body.status = "IN_PROGRESS";
        else body.status = patch.status;
      }
      if (patch.owner !== undefined) {
        body.owner = patch.owner;
      }
      if (patch.priority) {
        body.priority = patch.priority;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/human-cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error("Failed to update case in database");
      
      await fetchCases();
      setNotice(message);
    } catch (err) {
      console.error(err);
      setNotice("Lỗi: Không thể đồng bộ trạng thái can thiệp với Database.");
    }
  };

  const assignToMe = (item: HumanCase) => updateCase(item.id, { owner: "Lan Anh", status: "Đã phân công" }, `${item.id} đã được phân công cho Lan Anh.`);

  return <>
    <div className="staff-page-heading"><div><span className="breadcrumb">Vận hành <Icon name="chevron" size={13}/> Can thiệp của nhân viên</span><h1>Hàng đợi xử lý yêu cầu</h1><p>Phân loại theo mức ưu tiên, nhận xử lý và hoàn tất yêu cầu trong cùng một màn hình.</p></div><div className="heading-actions"><DemoStateControl state={state} setState={setState}/><Button icon="refresh" variant="secondary" onClick={() => { fetchCases(); setNotice("Đã đồng bộ hàng đợi với database thành công."); }}>Làm mới</Button></div></div>

    <section className="case-metrics" aria-label="Tổng quan yêu cầu"><article><span className="case-metric-icon blue"><Icon name="file"/></span><p><small>Yêu cầu đang mở</small><strong>{openCasesCount}</strong><em>Trong hàng đợi hiện tại</em></p></article><article><span className="case-metric-icon violet"><Icon name="user"/></span><p><small>Chưa phân công</small><strong>{unassignedCasesCount}</strong><em>Cần người tiếp nhận</em></p></article><article><span className="case-metric-icon red"><Icon name="alert"/></span><p><small>P0 chưa xác nhận</small><strong>{p0UnassignedCount}</strong><em>Xử lý ngay</em></p></article><article><span className="case-metric-icon amber"><Icon name="clock"/></span><p><small>Sắp quá thời hạn</small><strong>2</strong><em>Trong 30 phút tới</em></p></article><article><span className="case-metric-icon green"><Icon name="check"/></span><p><small>Đã giải quyết</small><strong>{resolvedCasesCount}</strong><em>Trong phiên mô phỏng</em></p></article></section>

    {notice && <div className="workflow-feedback" role="status"><Icon name="check"/><span>{notice}</span><button aria-label="Đóng thông báo" onClick={() => setNotice("")}><Icon name="close" size={15}/></button></div>}

    <section className="case-toolbar"><div className="case-tabs" role="tablist" aria-label="Phạm vi yêu cầu"><button role="tab" aria-selected={scope === "all"} onClick={() => setScope("all")}>Tất cả <b>{items.length}</b></button><button role="tab" aria-selected={scope === "mine"} onClick={() => setScope("mine")}>Của tôi <b>{mineCount}</b></button><button role="tab" aria-selected={scope === "unassigned"} onClick={() => setScope("unassigned")}>Chưa phân công <b>{unassignedCasesCount}</b></button></div><div className="case-filters"><label><Icon name="filter" size={16}/><select value={priority} onChange={(event) => setPriority(event.target.value as Priority | "all")} aria-label="Lọc theo mức ưu tiên"><option value="all">Mọi ưu tiên</option><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option></select></label><label><select value={sla} onChange={(event) => setSla(event.target.value as SlaFilter)} aria-label="Lọc theo thời hạn xử lý"><option value="all">Mọi thời hạn</option><option value="soon">Sắp quá hạn</option><option value="overdue">Đã quá hạn</option></select></label></div></section>

    {state !== "ready" ? <StateView state={state} emptyText="Không có case cần xử lý." onRetry={() => setState("ready")}/> : filtered.length === 0 ? <StateView state="empty" emptyText="Không có case phù hợp bộ lọc."/> : <div className="case-table-wrap"><table className="case-table"><thead><tr><th>Ưu tiên</th><th>Case / Bệnh nhân</th><th>Loại yêu cầu</th><th>Lý do kích hoạt</th><th>Tạo lúc</th><th>SLA</th><th>Người phụ trách</th><th>Trạng thái</th><th><span className="sr-only">Hành động</span></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className={item.priority === "P0" ? "case-row--urgent" : ""}><td><Badge tone={priorityTone[item.priority]}>{item.priority}</Badge></td><td><button className="case-link" onClick={() => setSelectedId(item.id)}><strong>{item.id}</strong><span>{item.patientName}</span></button></td><td><strong>{item.type}</strong></td><td><span className="trigger-text">{item.trigger}</span></td><td><span>{item.createdAt}<small>Hôm nay</small></span></td><td><span className={item.priority === "P0" ? "sla-urgent" : ""}><Icon name="clock" size={14}/>{item.slaDue}</span></td><td>{item.owner ? <span className="owner"><i>{item.owner.slice(0, 1)}</i>{item.owner}</span> : <button className="assign-button" onClick={() => assignToMe(item)}>+ Nhận case</button>}</td><td><Badge tone={item.status === "Mở" ? "warning" : item.status === "Đã giải quyết" ? "success" : "info"}>{item.status}</Badge></td><td><button className="icon-button" onClick={() => setSelectedId(item.id)} aria-label={`Mở chi tiết ${item.id}`}><Icon name="chevron"/></button></td></tr>)}</tbody></table></div>}
    <div className="table-footer"><span>Hiển thị {filtered.length} trong {items.length} yêu cầu</span><span>Trang 1 / 1</span></div>

    {selected && <><button className="detail-scrim" aria-label="Đóng chi tiết case" onClick={() => setSelectedId(null)}/><aside className="case-detail" aria-label={`Chi tiết ${selected.id}`}><header><div><Badge tone={priorityTone[selected.priority]}>{selected.priority}</Badge><strong>{selected.id}</strong></div><button className="icon-button" onClick={() => setSelectedId(null)} aria-label="Đóng"><Icon name="close"/></button></header><div className="case-detail__body"><span className="eyebrow">{selected.type}</span><h2>{selected.patientName}</h2><p>{selected.trigger}</p>{selected.priority === "P0" && <div className="quickview-alert"><Icon name="alert"/><span><strong>Không yêu cầu người bệnh chờ phản hồi</strong><small>Hướng dẫn gọi 115 phải được hiển thị ngay từ kênh bệnh nhân.</small></span></div>}<dl><div><dt>Trạng thái</dt><dd>{selected.status}</dd></div><div><dt>SLA đến hạn</dt><dd>{selected.slaDue}</dd></div><div><dt>Người phụ trách</dt><dd>{selected.owner || "Chưa phân công"}</dd></div><div><dt>Nguồn</dt><dd>Website · Mock API</dd></div></dl><div className="case-context"><Icon name="shield"/><p><strong>Ngữ cảnh an toàn</strong><span>Chỉ hiển thị dữ liệu tối thiểu. Mọi hành động dưới đây chỉ cập nhật UI.</span></p></div>{notice && <div className="drawer-feedback" role="status"><Icon name="check" size={16}/>{notice}</div>}<h3>Hành động tiếp theo</h3><div className="detail-actions">{!selected.owner && <Button icon="user" onClick={() => assignToMe(selected)}>Nhận case</Button>}<Button variant={selected.owner ? "primary" : "secondary"} icon="phone" onClick={() => setNotice(`Đã ghi nhận yêu cầu gọi ${selected.patientName} · Không thực hiện cuộc gọi thật.`)}>Ghi nhận gọi người bệnh</Button><Button variant="secondary" icon="arrow" onClick={() => updateCase(selected.id, { status: "Đã chuyển cấp" }, `${selected.id} đã chuyển cấp trong phiên demo.`)}>Chuyển cấp</Button>{selected.priority === "P0" ? <Button variant="secondary" icon="shield" onClick={() => setNotice(`${selected.id} cần supervisor review trước khi đóng.`)}>Yêu cầu duyệt đóng P0</Button> : <Button variant="secondary" icon="check" onClick={() => updateCase(selected.id, { status: "Đã giải quyết" }, `${selected.id} đã được đánh dấu giải quyết trong phiên demo.`)}>Đánh dấu đã giải quyết</Button>}</div></div></aside></>}
  </>;
}
