"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";

type Mode = "procedure" | "operations" | "patient";
const prompts: Record<Mode, string[]> = {
  procedure: ["Bệnh nhân BHYT cần mang giấy tờ gì?", "Sau khi có kết quả xét nghiệm thì làm gì?"],
  operations: ["Có bao nhiêu người bệnh đang chờ bác sĩ?", "Yêu cầu nào sắp quá thời hạn?"],
  patient: ["A024 hiện đang ở bước nào?", "Bệnh nhân còn thiếu giấy tờ gì?"],
};

export function ChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("procedure");
  const [patientContext, setPatientContext] = useState("A024 · Nguyễn V. A.");
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const ask = (value = query) => {
    if (!value.trim()) return;
    setQuery(value); setLoading(true); setSent(false);
    window.setTimeout(() => { setLoading(false); setSent(true); }, 550);
  };
  if (!open) return null;

  return <><button className="drawer-scrim is-open" aria-label="Đóng trợ lý" onClick={onClose}/><aside className="chat-drawer is-open" role="dialog" aria-modal="true" aria-label="Trợ lý nhân viên">
    <header><div className="chat-avatar"><Icon name="bot" /></div><div><strong>Trợ lý nhân viên</strong><span><i /> Dữ liệu mô phỏng · Chỉ hỗ trợ ra quyết định</span></div><button className="icon-button" onClick={onClose} aria-label="Đóng trợ lý"><Icon name="close" /></button></header>
    <div className="chat-mode" role="tablist" aria-label="Chế độ trợ lý">
      {(["procedure", "operations", "patient"] as Mode[]).map((item) => <button key={item} role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setSent(false); setQuery(""); }}>{item === "procedure" ? "Quy trình" : item === "operations" ? "Vận hành" : "Bệnh nhân"}</button>)}
    </div>
    {mode === "patient" && <label className="chat-context-select"><span>Ngữ cảnh bắt buộc</span><select value={patientContext} onChange={(event) => { setPatientContext(event.target.value); setSent(false); }}><option>A024 · Nguyễn V. A.</option><option>B011 · Phạm T. H.</option><option value="">Chọn lượt khám...</option></select><small><Icon name="shield" size={13}/> Dữ liệu tối thiểu theo vai trò Điều phối viên</small></label>}
    <div className="chat-body" aria-live="polite">
      {!sent && !loading && <><div className="assistant-intro"><Icon name={mode === "procedure" ? "book" : mode === "operations" ? "chart" : "users"} /><strong>{mode === "procedure" ? "Tra cứu quy trình đã phê duyệt" : mode === "operations" ? "Hỏi về chỉ số vận hành" : patientContext ? `Đang tra cứu: ${patientContext}` : "Chưa chọn lượt khám"}</strong><p>{mode === "patient" ? "Câu trả lời chỉ dùng ngữ cảnh đã chọn và không chỉnh sửa hồ sơ." : "Câu trả lời kèm nguồn, phạm vi và thời gian cập nhật."}</p></div><p className="suggestion-label">Gợi ý câu hỏi</p>{prompts[mode].map((prompt) => <button className="chat-suggestion" disabled={mode === "patient" && !patientContext} key={prompt} onClick={() => ask(prompt)}>{prompt}<Icon name="arrow" size={17} /></button>)}</>}
      {loading && <div className="typing" role="status"><span/><span/><span/> Đang tìm trong nguồn được duyệt...</div>}
      {sent && <><div className="chat-bubble chat-bubble--user">{query}</div><div className="chat-bubble chat-bubble--assistant">{mode === "operations" ? <><strong>Hiện có 14 người bệnh đang chờ bác sĩ.</strong><p>Trong đó 3 lượt đã chờ trên 30 phút.</p><dl><div><dt>Phạm vi</dt><dd>Cơ sở 1 · Hôm nay</dd></div><div><dt>Cập nhật</dt><dd>10:24</dd></div><div><dt>Nguồn</dt><dd>Dữ liệu mô phỏng: tiếp nhận và gọi số</dd></div></dl><Link className="chat-result-link" href="/staff/operations" onClick={onClose}>Mở bảng đã lọc <Icon name="arrow" size={14}/></Link></> : mode === "patient" ? <><span className="chat-context-chip"><Icon name="user" size={13}/>{patientContext}</span><strong>Lượt A024 đang chờ bác sĩ tại phòng 201.</strong><p>Đã chờ 32 phút, có cảnh báo sắp quá thời hạn.</p><small>Dữ liệu tối thiểu theo quyền · Cập nhật 10:24</small><Link className="chat-result-link" href="/staff/operations" onClick={onClose}>Mở lượt trong bảng hành trình <Icon name="arrow" size={14}/></Link></> : <><strong>Người bệnh khám BHYT cần chuẩn bị:</strong><ol><li>CCCD hoặc giấy tờ tùy thân hợp lệ.</li><li>Thẻ BHYT hoặc dữ liệu BHYT điện tử.</li><li>Giấy chuyển tuyến nếu thuộc trường hợp yêu cầu.</li></ol><a className="source-card" href="/tai-lieu/quy-trinh-ngoai-tru-tn1-cs1-qt-25-01.pdf" target="_blank" rel="noreferrer"><Icon name="file" size={18}/><span><strong>QT.25.01 · Lần ban hành 07</strong><small>Ban hành 05/12/2024 · Mục tiếp nhận</small></span></a></>}</div><div className="chat-disclaimer"><Icon name="shield" size={16}/> Nội dung mô phỏng; không chẩn đoán và không tự thực hiện hành động.</div></>}
    </div>
    <form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><label><span className="sr-only">Nhập câu hỏi</span><textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập câu hỏi của bạn..." rows={2}/></label><Button type="submit" aria-label="Gửi câu hỏi" disabled={!query.trim() || loading || (mode === "patient" && !patientContext)}><Icon name="arrow"/></Button></form>
  </aside></>;
}
