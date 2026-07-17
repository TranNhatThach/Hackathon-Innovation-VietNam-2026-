"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const topics = ["Giấy tờ khám BHYT", "Đặt lịch khám", "Quy trình khám lần đầu", "Lấy kết quả", "Lĩnh thuốc", "Chỉ đường trong viện"];

export function PatientFaq() {
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [support, setSupport] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const ask = async (text = query) => {
    const queryText = text.trim();
    if (!queryText || loading) return;

    setQuery(queryText);
    setLoading(true);
    setAsked(true);
    setAiResponse("");
    setSupport(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const targetUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.protocol}//${window.location.hostname}:8000`;
      const response = await fetch(`${targetUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: queryText,
          history: [],
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

      if (reader) {
        while (!done) {
          const { value: chunk, done: readerDone } = await reader.read();
          done = readerDone;
          buffer += decoder.decode(chunk, { stream: !done });
          setAiResponse(buffer);
        }
      }
    } catch (error) {
      console.error("Error fetching stream:", error);
      setAiResponse("Có lỗi xảy ra khi kết nối tới Server AI. Vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="faq-page"><section className="faq-intro"><div className="container"><span className="faq-bot"><Icon name="bot" size={30}/></span><span className="eyebrow">TRỢ LÝ THÔNG TIN BỆNH VIỆN</span><h1>Xin chào, tôi có thể giúp gì cho bạn?</h1><p>Tra cứu quy trình đã được duyệt. Không dùng để chẩn đoán hoặc xử lý cấp cứu.</p></div></section><div className="container faq-layout"><section className="faq-chat" aria-live="polite"><div className="faq-chat__header"><div><span><Icon name="bot"/></span><p><strong>Trợ lý Bệnh viện Tim Hà Nội</strong><small><i/> Sẵn sàng hỗ trợ · Kết nối trực tuyến</small></p></div><Link className="icon-button" href="/procedures" aria-label="Mở quy trình"><Icon name="file"/></Link></div><div className="faq-messages"><div className="faq-message faq-message--assistant"><p>Tôi có thể giúp bạn tìm giấy tờ, lịch khám, quy trình và chỉ đường. Bạn muốn hỏi nội dung nào?</p><small>10:24</small></div>{loading && !aiResponse && <div className="typing"><span/><span/><span/> Đang tìm trong nguồn đã được phê duyệt...</div>}{asked && <><div className="faq-message faq-message--user"><p>{query}</p></div>{(aiResponse || loading) && <div className="faq-message faq-message--assistant answer-card"><div className="markdown-content text-xs leading-6 md:text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown></div><div className="answer-actions"><Button variant="ghost" onClick={() => setSupport(true)}>Liên hệ nhân viên</Button></div>{support && <p className="inline-feedback" role="status"><Icon name="check" size={15}/> Đã tạo yêu cầu hỗ trợ. Trong sản phẩm thật, yêu cầu sẽ được chuyển tới nhân viên.</p>}</div>}</>}</div><div className="faq-topics"><span>Gợi ý:</span>{topics.slice(0, 3).map((item) => <button key={item} onClick={() => ask(item)}>{item}</button>)}</div><form className="faq-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><label><span className="sr-only">Nhập câu hỏi</span><textarea rows={2} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} placeholder="Ví dụ: Khám BHYT cần mang giấy tờ gì?"/></label><Button type="submit" disabled={!query.trim() || loading} aria-label="Gửi câu hỏi"><Icon name="arrow"/></Button><small><Icon name="shield" size={14}/> Không nhập thông tin sức khỏe hoặc định danh thật.</small></form></section><aside className="faq-sidebar"><div className="portal-card"><h2>Chủ đề phổ biến</h2>{topics.map((item) => <button onClick={() => ask(item)} key={item}><span><Icon name={item.includes("BHYT") ? "shield" : item.includes("thuốc") ? "pill" : "file"}/>{item}</span><Icon name="chevron"/></button>)}</div><div className="emergency-mini"><Icon name="alert"/><h2>Đây không phải dịch vụ cấp cứu</h2><p>Nếu đau ngực dữ dội, khó thở hoặc mất ý thức, hãy gọi 115 ngay.</p><a href="tel:115" className="button button--danger"><Icon name="phone"/> Gọi 115</a></div></aside></div></div>;
}
