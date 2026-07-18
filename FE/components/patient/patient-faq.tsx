"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/shared/ui";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { getApiBaseUrl } from "@/lib/api";
// NEW: STT/TTS Integration
import { useSTT } from "@/hooks/useSTT";
import { useTTS } from "@/hooks/useTTS";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
  loading: () => <p>Đang tải...</p>
});

const topics = ["Giấy tờ khám BHYT", "Đặt lịch khám", "Quy trình khám lần đầu", "Lấy kết quả", "Lĩnh thuốc", "Chỉ đường trong viện"];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ESCALATION_KEYWORDS = [
  "không tìm thấy",
  "không có thông tin",
  "chưa có thông tin",
  "không thể tìm thấy",
  "liên hệ hotline",
  "hotline",
  "tổng đài",
  "024 3942 2430",
  "0243.8248362",
  "nhân viên y tế",
  "liên hệ trực tiếp",
  "xin lỗi, tôi không",
  "xin lỗi, tôi chưa",
  "không hỗ trợ",
  "chưa hỗ trợ",
  "vui lòng gọi",
  "lỗi",
  "kết nối"
];

function shouldShowSupport(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some(keyword => lower.includes(keyword));
}

export function PatientFaq({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [support, setSupport] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const initialAsked = useRef(false);

  // NEW: STT Integration
  const { supported: sttSupported, listening, isProcessing: sttProcessing, realTimeTranscript, errorMessage, toggleListening, stopListening } = useSTT();

  // NEW: TTS Integration
  const { supported: ttsSupported, speaking, muted, toggleMute, speak, cancel: cancelSpeech } = useTTS();

  // NEW: Track previous loading state to detect streaming completion
  const prevLoadingRef = useRef(false);

  // NEW: Bind real-time transcript to query input value dynamically
  const queryBaseRef = useRef("");

  useEffect(() => {
    if (listening) {
      queryBaseRef.current = query;
    }
  }, [listening]);

  useEffect(() => {
    if (listening && realTimeTranscript) {
      setQuery(queryBaseRef.current ? queryBaseRef.current + " " + realTimeTranscript : realTimeTranscript);
    }
  }, [realTimeTranscript, listening]);

  // NEW: Auto-speak when streaming completes (loading goes true→false)
  useEffect(() => {
    if (prevLoadingRef.current && !loading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        speak(lastMessage.content);
      }
    }
    prevLoadingRef.current = loading;
  }, [loading, messages, speak]);

  const ask = async (text = query) => {
    const queryText = text.trim();
    if (!queryText || loading) return;

    // NEW: Stop listening and cancel speech when sending a new message
    stopListening();
    cancelSpeech();

    setQuery("");
    setLoading(true);
    setAiResponse("");
    setSupport(false);

    const newMessages: Message[] = [...messages, { role: "user", content: queryText }];
    setMessages(newMessages);

    try {
      const targetUrl = getApiBaseUrl();
      const response = await fetch(`${targetUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: queryText,
          history: messages.map(msg => ({ role: msg.role, content: msg.content })),
          stream: true,
          agent_type: "patient"
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      let lastUpdate = 0;
      if (reader) {
        while (!done) {
          const { value: chunk, done: readerDone } = await reader.read();
          done = readerDone;
          buffer += decoder.decode(chunk, { stream: !done });
          
          const now = Date.now();
          if (done || now - lastUpdate > 60) {
            lastUpdate = now;
            setAiResponse(buffer);
          }
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: buffer }]);
      setAiResponse("");
    } catch (error) {
      console.error("Error fetching stream:", error);
      setAiResponse("Có lỗi xảy ra khi kết nối tới Server AI. Vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuestion || initialAsked.current) return;
    initialAsked.current = true;
    void ask(initialQuestion);
  }, [initialQuestion]);

  return <div className="faq-page"><section className="faq-intro"><div className="container"><span className="faq-bot"><Icon name="bot" size={30}/></span><span className="eyebrow">TRỢ LÝ THÔNG TIN BỆNH VIỆN</span><h1>Xin chào, tôi có thể giúp gì cho bạn?</h1><p>Tra cứu quy trình đã được duyệt. Không dùng để chẩn đoán hoặc xử lý cấp cứu.</p></div></section><div className="container faq-layout"><section className="faq-chat" aria-live="polite"><div className="faq-chat__header"><div><span><Icon name="bot"/></span><p><strong>Trợ lý Bệnh viện Tim Hà Nội</strong><small><i/> Sẵn sàng hỗ trợ · Kết nối trực tuyến</small></p></div>{/* NEW: TTS mute toggle + file link */}<div className="header-actions">{ttsSupported && <button className={`icon-button tts-toggle${muted ? "" : " is-active"}${speaking ? " is-speaking" : ""}`} onClick={toggleMute} aria-label={muted ? "Bật đọc tự động" : "Tắt đọc tự động"} title={muted ? "Bật đọc tự động" : "Tắt đọc tự động"}><Icon name={muted ? "volume-off" : "volume"}/></button>}<Link className="icon-button" href="/procedures" aria-label="Mở quy trình"><Icon name="file"/></Link></div></div><div className="faq-messages"><div className="faq-message faq-message--assistant"><p>Tôi có thể giúp bạn tìm giấy tờ, lịch khám, quy trình và chỉ đường. Bạn muốn hỏi nội dung nào?</p><small>10:24</small></div>{messages.map((msg, index) => <div key={index} className={`faq-message faq-message--${msg.role}`}><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>{msg.role === "assistant" && shouldShowSupport(msg.content) && <div className="answer-actions"><Button variant="ghost" onClick={() => setSupport(true)}>Liên hệ nhân viên</Button></div>}{msg.role === "assistant" && support && index === messages.length - 1 && <p className="inline-feedback" role="status"><Icon name="check" size={15}/> Đã tạo yêu cầu hỗ trợ. Trong sản phẩm thật, yêu cầu sẽ được chuyển tới nhân viên.</p>}</div>)}{loading && !aiResponse && <div className="typing"><span/><span/><span/> Đang tìm trong nguồn đã được phê duyệt...</div>}{loading && aiResponse && <div className="faq-message faq-message--assistant"><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown></div></div>}</div><div className="faq-topics"><span>Gợi ý:</span>{topics.slice(0, 3).map((item) => <button key={item} onClick={() => ask(item)}>{item}</button>)}</div><form className="faq-input" style={{ flexWrap: 'wrap' }} onSubmit={(event) => { event.preventDefault(); ask(); }}>{/* STEP 3: Display error message elegantly */}{errorMessage && <div className="stt-error"><Icon name="alert" size={14}/> {errorMessage}</div>}<label style={{ width: errorMessage ? '100%' : undefined }}><span className="sr-only">Nhập câu hỏi</span><textarea rows={2} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} placeholder="Ví dụ: Khám BHYT cần mang giấy tờ gì?"/></label>{/* NEW: STT microphone button */}{sttSupported && <button type="button" className={`mic-button${listening ? " is-listening" : ""}${sttProcessing ? " is-processing" : ""}`} disabled={sttProcessing} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleListening(); }} aria-label={listening ? "Dừng ghi âm" : sttProcessing ? "Đang xử lý âm thanh..." : "Nói để nhập"} title={listening ? "Dừng ghi âm" : sttProcessing ? "Đang xử lý âm thanh..." : "Nhấn để nói"}><Icon name={listening ? "mic-off" : sttProcessing ? "refresh" : "mic"}/>{listening && <span className="speech-status">Đang nghe...</span>}{sttProcessing && <span className="speech-status">Đang xử lý...</span>}</button>}<Button type="submit" disabled={!query.trim() || loading} aria-label="Gửi câu hỏi"><Icon name="arrow"/></Button><small><Icon name="shield" size={14}/> Không nhập thông tin sức khỏe hoặc định danh thật.</small></form></section><aside className="faq-sidebar"><div className="portal-card"><h2>Chủ đề phổ biến</h2>{topics.map((item) => <button onClick={() => ask(item)} key={item}><span><Icon name={item.includes("BHYT") ? "shield" : item.includes("thuốc") ? "pill" : "file"}/>{item}</span><Icon name="chevron"/></button>)}</div><div className="emergency-mini"><Icon name="alert"/><h2>Đây không phải dịch vụ cấp cứu</h2><p>Nếu đau ngực dữ dội, khó thở hoặc mất ý thức, hãy gọi 115 ngay.</p><a href="tel:115" className="button button--danger"><Icon name="phone"/> Gọi 115</a></div></aside></div></div>;
}
