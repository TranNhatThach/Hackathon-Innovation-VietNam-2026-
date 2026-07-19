"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import remarkGfm from "remark-gfm";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/shared/ui";
import { useSpeech } from "@/hooks/use-speech";
import { getApiBaseUrl } from "@/lib/api";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false, loading: () => <p>Đang tải...</p> });
const topics = ["Giấy tờ khám BHYT", "Đặt lịch khám", "Quy trình khám lần đầu", "Lấy kết quả", "Lĩnh thuốc", "Chỉ đường trong viện"];
type Message = { role: "user" | "assistant"; content: string };

const escalationKeywords = ["không tìm thấy", "không có thông tin", "chưa có thông tin", "hotline", "tổng đài", "19001082", "nhân viên y tế", "liên hệ trực tiếp", "không hỗ trợ", "vui lòng gọi", "lỗi", "kết nối"];
const shouldShowSupport = (text: string) => escalationKeywords.some((keyword) => text.toLowerCase().includes(keyword));

export function PatientFaq({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [support, setSupport] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const initialAsked = useRef(false);
  const speech = useSpeech(useCallback((text: string) => setQuery(text), []));

  const ask = useCallback(async (text = query) => {
    const queryText = text.trim();
    if (!queryText || loading) return;
    setQuery(""); setLoading(true); setAiResponse(""); setSupport(false);
    const newMessages: Message[] = [...messages, { role: "user", content: queryText }];
    setMessages(newMessages);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText, history: messages, stream: true, agent_type: "patient" }),
      });
      if (!response.ok) throw new Error();
      const reader = response.body?.getReader(); const decoder = new TextDecoder(); let buffer = ""; let lastUpdate = 0;
      if (reader) while (true) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        if (Date.now() - lastUpdate > 60) { lastUpdate = Date.now(); setAiResponse(buffer); }
      }
      setMessages((previous) => [...previous, { role: "assistant", content: buffer }]);
      setAiResponse("");
    } catch {
      setAiResponse("Có lỗi xảy ra khi kết nối tới Server AI. Vui lòng kiểm tra lại kết nối.");
    } finally { setLoading(false); }
  }, [loading, messages, query]);

  useEffect(() => {
    if (!initialQuestion || initialAsked.current) return;
    initialAsked.current = true;
    void ask(initialQuestion);
  }, [ask, initialQuestion]);

  return <div className="faq-page">
    <section className="faq-intro"><div className="container"><span className="faq-bot"><Icon name="bot" size={30}/></span><span className="eyebrow">TRỢ LÝ THÔNG TIN BỆNH VIỆN</span><h1>Xin chào, tôi có thể giúp gì cho bạn?</h1><p>Tra cứu quy trình đã được duyệt. Không dùng để chẩn đoán hoặc xử lý cấp cứu.</p></div></section>
    <div className="container faq-layout"><section className="faq-chat" aria-live="polite">
      <div className="faq-chat__header"><div><span><Icon name="bot"/></span><p><strong>Trợ lý Bệnh viện Tim Hà Nội</strong><small><i/> Sẵn sàng hỗ trợ · Kết nối trực tuyến</small></p></div><Link className="icon-button" href="/procedures" aria-label="Mở quy trình"><Icon name="file"/></Link></div>
      <div className="faq-messages"><div className="faq-message faq-message--assistant"><p>Tôi có thể giúp bạn tìm giấy tờ, lịch khám, quy trình và chỉ đường. Bạn muốn hỏi nội dung nào?</p><small>10:24</small></div>
        {messages.map((message, index) => <div key={index} className={`faq-message faq-message--${message.role}`}><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>{message.role === "assistant" && <button type="button" className="speech-play" onClick={() => speech.speak(message.content)} aria-label={speech.speaking ? "Dừng đọc" : "Đọc câu trả lời"}><Icon name={speech.speaking ? "stop" : "volume"} size={16}/></button>}{message.role === "assistant" && shouldShowSupport(message.content) && <div className="answer-actions"><Button variant="ghost" onClick={() => setSupport(true)}>Liên hệ nhân viên</Button></div>}{message.role === "assistant" && support && index === messages.length - 1 && <p className="inline-feedback" role="status"><Icon name="check" size={15}/> Đã tạo yêu cầu hỗ trợ.</p>}</div>)}
        {loading && !aiResponse && <div className="typing"><span/><span/><span/> Đang tìm trong nguồn đã được phê duyệt...</div>}{loading && aiResponse && <div className="faq-message faq-message--assistant"><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown></div></div>}
      </div>
      <div className="faq-topics"><span>Gợi ý:</span>{topics.slice(0, 3).map((item) => <button key={item} onClick={() => void ask(item)}>{item}</button>)}</div>
      <form className="faq-input" style={{ gridTemplateColumns: "1fr 44px" }} onSubmit={(event) => { event.preventDefault(); void ask(); }}><label style={{ position: "relative" }}><span className="sr-only">Nhập câu hỏi</span><textarea style={{ paddingRight: 52 }} rows={2} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} placeholder={speech.listening ? "Đang nghe..." : "Ví dụ: Khám BHYT cần mang giấy tờ gì?"}/><button type="button" className={`speech-mic${speech.listening ? " is-listening" : ""}`} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, border: 0, borderRadius: 10 }} onClick={speech.toggleListening} disabled={!speech.supported.stt || loading} aria-label={speech.listening ? "Dừng nghe" : "Nhập bằng giọng nói"} title={speech.listening ? "Dừng nghe" : "Nhập bằng giọng nói"}><Icon name={speech.listening ? "stop" : "microphone"} size={18}/></button></label><Button type="submit" disabled={!query.trim() || loading} aria-label="Gửi câu hỏi"><Icon name="arrow"/></Button><small><Icon name="shield" size={14}/> Không nhập thông tin sức khỏe hoặc định danh thật.</small>{speech.error && <small className="speech-error" role="alert">{speech.error}</small>}</form>
    </section><aside className="faq-sidebar"><div className="portal-card"><h2>Chủ đề phổ biến</h2>{topics.map((item) => <button onClick={() => void ask(item)} key={item}><span><Icon name={item.includes("BHYT") ? "shield" : item.includes("thuốc") ? "pill" : "file"}/>{item}</span><Icon name="chevron"/></button>)}</div><div className="emergency-mini"><Icon name="alert"/><h2>Đây không phải dịch vụ cấp cứu</h2><p>Nếu đau ngực dữ dội, khó thở hoặc mất ý thức, hãy gọi 115 ngay.</p><a href="tel:115" className="button button--danger"><Icon name="phone"/> Gọi 115</a></div></aside></div>
  </div>;
}
