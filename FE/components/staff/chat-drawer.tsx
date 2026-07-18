"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/shared/ui";
import { getApiBaseUrl } from "@/lib/api";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false, loading: () => <p>Đang tải...</p> });
type Mode = "procedure" | "operations" | "patient";
type Message = { role: "user" | "assistant"; content: string };
type VisitContext = { visit_code: string; patient_name: string; phone: string | null; queue_number: string; stage: string; stage_label: string; entered_stage_at: string; room: string | null; doctor: string | null; next_action: string | null; status: string };

const stages = [
  ["SCHEDULED", "Đã xác nhận lịch"], ["REGISTRATION", "Đăng ký"], ["PAYMENT", "Thanh toán"],
  ["VITALS", "Đo sinh hiệu"], ["WAITING_DOCTOR", "Chờ bác sĩ"], ["CONSULTATION", "Đang khám"],
  ["TESTS", "Cận lâm sàng"], ["RESULTS", "Nhận kết quả"], ["PHARMACY", "Nhận thuốc"], ["COMPLETED", "Hoàn tất"],
];

const prompts: Record<Mode, string[]> = {
  procedure: ["Bệnh nhân BHYT cần mang giấy tờ gì?", "Sau khi có kết quả xét nghiệm thì làm gì?"],
  operations: ["Có bao nhiêu người bệnh đang chờ bác sĩ?", "Yêu cầu nào sắp quá thời hạn?"],
  patient: ["Bệnh nhân hiện đang ở bước nào?", "Bệnh nhân cần làm gì tiếp theo?"],
};

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function formatElapsedTime(enteredStageAt: string) {
  const enteredAt = new Date(enteredStageAt).getTime();
  if (!Number.isFinite(enteredAt)) return "Chưa xác định";

  const totalMinutes = Math.max(0, Math.floor((Date.now() - enteredAt) / 60000));
  if (totalMinutes < 1) return "Dưới 1 phút";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [days ? `${days} ngày` : "", hours ? `${hours} giờ` : "", minutes ? `${minutes} phút` : ""]
    .filter(Boolean)
    .join(" ");
}

function formatVietnamDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "Chưa xác định";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function ChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("procedure");
  const [visits, setVisits] = useState<VisitContext[]>([]);
  const [visitCode, setVisitCode] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const selected = visits.find((visit) => visit.visit_code === visitCode) ?? null;
  const filteredVisits = useMemo(() => {
    const value = visitSearch.trim().toLowerCase();
    return value ? visits.filter((visit) => `${visit.patient_name} ${visit.visit_code} ${visit.queue_number} ${visit.phone ?? ""}`.toLowerCase().includes(value)) : visits;
  }, [visitSearch, visits]);

  const loadVisits = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/visits/staff`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as VisitContext[];
      setVisits(result);
      setVisitCode((current) => result.some((item) => item.visit_code === current) ? current : (result[0]?.visit_code ?? ""));
    } catch { setVisits([]); setVisitCode(""); }
  };

  useEffect(() => { if (open && mode === "patient") void loadVisits(); }, [open, mode]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose, open]);

  const patientAnswer = (visit: VisitContext) => {
    const elapsed = formatElapsedTime(visit.entered_stage_at);
    const enteredAt = formatVietnamDateTime(visit.entered_stage_at);
    const checkedAt = formatVietnamDateTime(new Date());
    return `**${visit.patient_name}** (${visit.queue_number}) hiện ở bước **${visit.stage_label}**.\n\n- Mã lượt: ${visit.visit_code}\n- Bác sĩ: ${visit.doctor ?? "Chưa phân công"}\n- Vị trí: ${visit.room ?? "Chưa cập nhật"}\n- Thời gian ở bước này: **${elapsed}**\n- Bắt đầu bước: ${enteredAt} (giờ Việt Nam)\n- Tiếp theo: ${visit.next_action ?? "Chưa có hướng dẫn"}\n\nDữ liệu được đọc trực tiếp từ hồ sơ hành trình lúc ${checkedAt} (giờ Việt Nam).`;
  };

  const ask = async (value = query) => {
    const text = value.trim(); if (!text || loading) return;
    setQuery("");
    if (mode === "patient") {
      if (!selected) return;
      setMessages((items) => [...items, { role: "user", content: text }, { role: "assistant", content: patientAnswer(selected) }]);
      return;
    }
    setLoading(true);
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    const answerIndex = history.length;
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: messages, stream: true, agent_type: "employee" }) });
      if (!response.ok) throw new Error();
      const reader = response.body?.getReader(); const decoder = new TextDecoder(); let output = "";
      if (reader) { while (true) { const part = await reader.read(); if (part.done) break; output += decoder.decode(part.value, { stream: true }); setMessages((items) => items.map((item, index) => index === answerIndex ? { ...item, content: output } : item)); } }
    } catch { setMessages((items) => items.map((item, index) => index === answerIndex ? { ...item, content: "Không thể kết nối trợ lý AI. Vui lòng thử lại." } : item)); }
    finally { setLoading(false); }
  };

  const updateStage = async (stage: string) => {
    if (!selected) return;
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/visits/${encodeURIComponent(selected.visit_code)}/stage`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
      if (!response.ok) throw new Error();
      const updated = await response.json() as VisitContext;
      setVisits((items) => items.map((item) => item.visit_code === updated.visit_code ? updated : item));
      setMessages([{ role: "assistant", content: `Đã cập nhật **${updated.patient_name}** sang bước **${updated.stage_label}**.` }]);
    } catch { setMessages([{ role: "assistant", content: "Không thể cập nhật bước khám. Vui lòng thử lại." }]); }
    finally { setLoading(false); }
  };

  if (!open) return null;
  return <><button className="drawer-scrim is-open" aria-label="Đóng trợ lý" onClick={onClose}/><aside className="chat-drawer is-open" role="dialog" aria-modal="true" aria-label="Trợ lý nhân viên">
    <header><div className="chat-avatar"><Icon name="bot"/></div><div><strong>Trợ lý nhân viên</strong><span><i/> Dữ liệu trực tuyến · PostgreSQL</span></div><button className="icon-button" onClick={onClose} aria-label="Đóng trợ lý"><Icon name="close"/></button></header>
    <div className="chat-mode" role="tablist">{(["procedure", "operations", "patient"] as Mode[]).map((item) => <button key={item} role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setMessages([]); setQuery(""); }}>{item === "procedure" ? "Quy trình" : item === "operations" ? "Vận hành" : "Bệnh nhân"}</button>)}</div>
    {mode === "patient" && <div className="chat-context-select"><span>Tìm lượt khám thật</span><input value={visitSearch} onChange={(event) => setVisitSearch(event.target.value)} placeholder="Tên, mã lượt, số điện thoại..."/><select value={visitCode} onChange={(event) => { setVisitCode(event.target.value); setMessages([]); }}>{filteredVisits.length === 0 && <option value="">Chưa có lượt khám đã xác nhận</option>}{filteredVisits.map((visit) => <option value={visit.visit_code} key={visit.visit_code}>{visit.queue_number} · {visit.patient_name} · {visit.stage_label}</option>)}</select>{selected && <><small><Icon name="route" size={13}/> Hiện tại: {selected.stage_label}</small><span>Cập nhật bước hành trình</span><select value={selected.stage} disabled={loading} onChange={(event) => void updateStage(event.target.value)}>{stages.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></>}</div>}
    <div className="chat-body" aria-live="polite">{messages.length === 0 && <><div className="assistant-intro"><Icon name={mode === "patient" ? "users" : mode === "operations" ? "chart" : "book"}/><strong>{mode === "patient" ? selected ? `Đang tra cứu: ${selected.queue_number} · ${selected.patient_name}` : "Chưa có lượt khám thật" : "Trợ lý nghiệp vụ"}</strong><p>{mode === "patient" ? "Trạng thái được đọc trực tiếp từ hành trình người bệnh, không do AI suy đoán." : "Tra cứu thông tin hỗ trợ nhân viên."}</p></div><p className="suggestion-label">Gợi ý câu hỏi</p>{prompts[mode].map((prompt) => <button className="chat-suggestion" disabled={mode === "patient" && !selected} key={prompt} onClick={() => void ask(prompt)}>{prompt}<Icon name="arrow" size={17}/></button>)}</>}{messages.map((message, index) => <div key={index} className={`chat-bubble chat-bubble--${message.role}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>)}{loading && <div className="typing" role="status">Đang cập nhật...</div>}</div>
    <form className="chat-input" onSubmit={(event) => { event.preventDefault(); void ask(); }}><label><span className="sr-only">Nhập câu hỏi</span><textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập câu hỏi của bạn..." rows={2}/></label><Button type="submit" disabled={!query.trim() || loading || (mode === "patient" && !selected)}><Icon name="arrow"/></Button></form>
  </aside></>;
}
