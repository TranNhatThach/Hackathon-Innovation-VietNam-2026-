"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import remarkGfm from "remark-gfm";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/shared/ui";
import { useSpeech } from "@/hooks/use-speech";
import { getApiBaseUrl } from "@/lib/api";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
type Message = { role: "user" | "assistant"; content: string };
const suggestions = ["Đi khám lần đầu cần gì?", "Khám BHYT mang giấy tờ gì?"];

export function HomeChat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [stream, setStream] = useState("");
  const [loading, setLoading] = useState(false);
  const [patientPhone, setPatientPhone] = useState("0912345678");
  const speech = useSpeech(useCallback((text: string) => setQuery(text), []));

  const submit = async (value = query) => {
    const text = value.trim();
    if (!text || loading) return;
    setQuery(""); setLoading(true); setStream("");
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/chat`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          message: text, 
          history: messages, 
          stream: true, 
          agent_type: "patient",
          user_id: patientPhone === "anonymous" ? undefined : patientPhone
        }) 
      });
      if (!response.ok) throw new Error();
      const reader = response.body?.getReader(); const decoder = new TextDecoder(); let answer = "";
      if (reader) while (true) { const part = await reader.read(); if (part.done) break; answer += decoder.decode(part.value, { stream: true }); setStream(answer); }
      setMessages([...history, { role: "assistant", content: answer }]); setStream("");
    } catch { setMessages([...history, { role: "assistant", content: "Không thể kết nối trợ lý. Bạn vui lòng thử lại." }]); }
    finally { setLoading(false); }
  };

  return <section className="home-support" aria-label="Hỏi trợ lý bệnh viện"><div className="home-support__content">
    {/* Giả lập SĐT bệnh nhân phục vụ Demo Mute/Unmute */}
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', color: '#ccc' }}>
      <Icon name="user" size={14} />
      <span>Giả lập SĐT:</span>
      <select 
        value={patientPhone} 
        onChange={(e) => { setPatientPhone(e.target.value); setMessages([]); }} 
        style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e293b', color: '#fff', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
      >
        <option value="0912345678">0912345678 (Nguyễn Văn An - Đang có case Mở)</option>
        <option value="0987654321">0987654321 (Trần Thị Bình - Không bị khóa)</option>
        <option value="anonymous">Khách ẩn danh</option>
      </select>
    </div>

    {messages.length === 0 && !loading ? <div className="home-support__welcome"><span className="home-support__spark"><Icon name="bot" size={27}/></span><h1><em>Xin chào,</em> tôi có thể giúp gì cho bạn?</h1><p>Hỏi nhanh thông tin cần thiết trước khi đến Bệnh viện Tim Hà Nội.</p><div className="home-support__capabilities"><button onClick={() => void submit("Tôi cần chuẩn bị giấy tờ gì khi đi khám?")}><span><Icon name="file"/></span><strong>Chuẩn bị giấy tờ</strong><small>CCCD, BHYT, giấy hẹn</small></button><button onClick={() => void submit("Hướng dẫn đặt và tra cứu lịch khám")}><span><Icon name="calendar"/></span><strong>Lịch khám</strong><small>Đặt mới hoặc tra cứu</small></button><button onClick={() => void submit("Quy trình đi khám lần đầu như thế nào?")}><span><Icon name="route"/></span><strong>Quy trình khám</strong><small>Biết bước cần làm tiếp</small></button></div></div> : <div className="home-support__conversation" aria-live="polite">
      {messages.map((message, index) => <div className={`home-support__message home-support__message--${message.role}`} key={index}><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>{message.role === "assistant" && <button type="button" className="speech-play" onClick={() => speech.speak(message.content)} aria-label={speech.speaking ? "Dừng đọc" : "Đọc câu trả lời"}><Icon name={speech.speaking ? "stop" : "volume"} size={16}/></button>}</div>)}
      {stream && <div className="home-support__message home-support__message--assistant"><ReactMarkdown remarkPlugins={[remarkGfm]}>{stream}</ReactMarkdown></div>}{loading && !stream && <div className="typing"><span/><span/><span/> Đang tìm thông tin...</div>}
    </div>}
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }}><span className="home-support__form-icon"><Icon name="bot" size={21}/></span><label><span className="sr-only">Nhập câu hỏi</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={speech.listening ? "Đang nghe..." : "Bạn cần hỗ trợ gì?"} autoComplete="off"/></label><button type="button" className={`speech-mic${speech.listening ? " is-listening" : ""}`} onClick={speech.toggleListening} disabled={!speech.supported.stt || loading} aria-label={speech.listening ? "Dừng nghe" : "Nhập bằng giọng nói"}><Icon name={speech.listening ? "stop" : "microphone"}/></button><Button type="submit" disabled={!query.trim() || loading} aria-label="Gửi câu hỏi"><Icon name="arrow"/></Button></form>
    {speech.error && <p className="speech-error" role="alert">{speech.error}</p>}
    <div className="home-support__below"><div className="home-support__suggestions">{suggestions.map((item) => <button key={item} onClick={() => void submit(item)} disabled={loading}>{item}</button>)}</div><small><Icon name="shield" size={13}/> Không dùng cho tình huống cấp cứu</small></div>
  </div></section>;
}
