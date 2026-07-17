"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "procedure" | "operations" | "patient";
const prompts: Record<Mode, string[]> = {
  procedure: ["Bệnh nhân BHYT cần mang giấy tờ gì?", "Sau khi có kết quả xét nghiệm thì làm gì?"],
  operations: ["Có bao nhiêu người bệnh đang chờ bác sĩ?", "Yêu cầu nào sắp quá thời hạn?"],
  patient: ["A024 hiện đang ở bước nào?", "Bệnh nhân còn thiếu giấy tờ gì?"],
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("procedure");
  const [patientContext, setPatientContext] = useState("A024 · Nguyễn V. A.");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  // Reset messages when switching modes
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setMessages([]);
    setQuery("");
  };

  const ask = async (value = query) => {
    const text = value.trim();
    if (!text || loading) return;

    setQuery("");
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    // Add empty assistant message for streaming response
    const placeholderIdx = newMessages.length;
    const nextMessages: Message[] = [...newMessages, { role: "assistant", content: "" }];
    setMessages(nextMessages);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const targetUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.protocol}//${window.location.hostname}:8000`;
      
      const response = await fetch(`${targetUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(msg => ({ role: msg.role, content: msg.content })),
          stream: true,
          agent_type: "employee"
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      if (reader) {
        while (!done) {
          const { value: chunk, done: readerDone } = await reader.read();
          done = readerDone;
          buffer += decoder.decode(chunk, { stream: !done });
          
          if (buffer) {
            setMessages((prev) => {
              const updated = [...prev];
              if (updated[placeholderIdx]) {
                updated[placeholderIdx] = { ...updated[placeholderIdx], content: buffer };
              }
              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching stream:", error);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[placeholderIdx]) {
          updated[placeholderIdx] = { ...updated[placeholderIdx], content: "Có lỗi xảy ra khi kết nối tới Server AI. Vui lòng kiểm tra lại kết nối." };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return <><button className="drawer-scrim is-open" aria-label="Đóng trợ lý" onClick={onClose}/><aside className="chat-drawer is-open" role="dialog" aria-modal="true" aria-label="Trợ lý nhân viên">
    <header><div className="chat-avatar"><Icon name="bot" /></div><div><strong>Trợ lý nhân viên</strong><span><i /> Dữ liệu trực tuyến · Trợ lý AI</span></div><button className="icon-button" onClick={onClose} aria-label="Đóng trợ lý"><Icon name="close" /></button></header>
    <div className="chat-mode" role="tablist" aria-label="Chế độ trợ lý">
      {(["procedure", "operations", "patient"] as Mode[]).map((item) => <button key={item} role="tab" aria-selected={mode === item} onClick={() => handleModeChange(item)}>{item === "procedure" ? "Quy trình" : item === "operations" ? "Vận hành" : "Bệnh nhân"}</button>)}
    </div>
    {mode === "patient" && <label className="chat-context-select"><span>Ngữ cảnh bắt buộc</span><select value={patientContext} onChange={(event) => { setPatientContext(event.target.value); setMessages([]); }}><option>A024 · Nguyễn V. A.</option><option>B011 · Phạm T. H.</option><option value="">Chọn lượt khám...</option></select><small><Icon name="shield" size={13}/> Dữ liệu tối thiểu theo vai trò Điều phối viên</small></label>}
    <div className="chat-body" aria-live="polite">
      {messages.length === 0 && !loading && <><div className="assistant-intro"><Icon name={mode === "procedure" ? "book" : mode === "operations" ? "chart" : "users"} /><strong>{mode === "procedure" ? "Tra cứu quy trình đã phê duyệt" : mode === "operations" ? "Hỏi về chỉ số vận hành" : patientContext ? `Đang tra cứu: ${patientContext}` : "Chưa chọn lượt khám"}</strong><p>{mode === "patient" ? "Câu trả lời chỉ dùng ngữ cảnh đã chọn và không chỉnh sửa hồ sơ." : "Câu trả lời kèm nguồn, phạm vi và thời gian cập nhật."}</p></div><p className="suggestion-label">Gợi ý câu hỏi</p>{prompts[mode].map((prompt) => <button className="chat-suggestion" disabled={mode === "patient" && !patientContext} key={prompt} onClick={() => ask(prompt)}>{prompt}<Icon name="arrow" size={17} /></button>)}</>}
      
      {messages.map((msg, index) => (
        <div key={index} className={`chat-bubble chat-bubble--${msg.role}`}>
          <div className="markdown-content text-xs leading-6 md:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        </div>
      ))}
      
      {loading && <div className="typing" role="status"><span/><span/><span/> Đang tìm trong nguồn được duyệt...</div>}
      {messages.length > 0 && <div className="chat-disclaimer"><Icon name="shield" size={16}/> Nội dung do AI tạo ra; vui lòng đối chiếu quy trình chính thức.</div>}
    </div>
    <form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><label><span className="sr-only">Nhập câu hỏi</span><textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} placeholder="Nhập câu hỏi của bạn..." rows={2}/></label><Button type="submit" aria-label="Gửi câu hỏi" disabled={!query.trim() || loading || (mode === "patient" && !patientContext)}><Icon name="arrow"/></Button></form>
  </aside></>;
}

