import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Stethoscope, AlertTriangle } from 'lucide-react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Xin chào! Tôi là Trợ lý AI của Bệnh viện Tim Hà Nội. Tôi có thể giúp gì cho bạn về thông tin đặt lịch khám, quy trình tiếp tiếp đón, bảng giá dịch vụ hay hỗ trợ các tình huống khẩn cấp hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "Đặt lịch khám BS Hùng 18/07",
    "Bảng giá siêu âm tim",
    "Cách đặt lịch qua Zalo",
    "Tôi đang bị đau ngực dữ dội"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const submitMessage = async (messageText) => {
    setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
    setLoading(true);

    // Add empty assistant message for streaming response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          history: messages.slice(1).map(msg => ({ role: msg.role, content: msg.content })), // exclude initial greeting
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        buffer += decoder.decode(value, { stream: !done });
        
        if (buffer) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = { ...updated[lastIdx], content: buffer };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = { ...updated[lastIdx], content: 'Có lỗi xảy ra khi kết nối tới Server AI. Vui lòng kiểm tra lại kết nối.' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    submitMessage(userMessage);
  };

  const handleSuggestClick = (text) => {
    if (loading) return;
    
    // Customize text for testing convenience
    let finalQuery = text;
    if (text === "Đặt lịch khám BS Hùng 18/07") {
      finalQuery = "Đặt lịch khám với bác sĩ Nguyễn Văn Hùng vào ngày 2026-07-18 lúc 08:30 cho bệnh nhân Nguyễn Văn A, SĐT 0912345678";
    } else if (text === "Tôi đang bị đau ngực dữ dội") {
      finalQuery = "Tôi đang bị tức ngực dữ dội và khó thở, phải làm sao?";
    }
    
    submitMessage(finalQuery);
  };

  return (
    <div className="flex flex-col h-[580px] w-full max-w-4xl bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-lg">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-sm">
              Trợ lý AI Y tế
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium">Bản Q&A</span>
            </h3>
            <p className="text-[10px] text-slate-400">Hỗ trợ tra cứu tri thức chính thức</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-rose-400 font-semibold bg-rose-950/20 px-2.5 py-1 rounded-full border border-rose-900/30 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> 
          <span>Không kê đơn điều trị</span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => {
          const isEmergencyResponse = msg.content.includes("CẢNH BÁO KHẨN CẤP");
          return (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-3`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-rose-400" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-tr-none shadow-md'
                    : isEmergencyResponse 
                      ? 'bg-rose-950/40 border-2 border-rose-500 text-rose-200 rounded-tl-none font-medium'
                      : 'bg-slate-800/60 border border-slate-700/40 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.content === '' && loading ? (
                  <div className="flex items-center space-x-1.5 py-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                ) : (
                  <div className="whitespace-pre-line prose prose-invert max-w-none text-xs leading-6 md:text-sm">
                    {msg.content}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2 px-6 py-2.5 bg-slate-950/20 border-t border-slate-800/60">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={() => handleSuggestClick(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              s.includes("đau ngực") 
                ? "bg-rose-950/30 hover:bg-rose-500/20 border-rose-900/40 hover:border-rose-500/50 text-rose-400 font-semibold"
                : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/40 hover:border-slate-500/30 text-slate-300 hover:text-slate-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950/30 border-t border-slate-800/80">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hãy hỏi tôi về đặt lịch khám, bảng giá, quy trình BHYT..."
            className="flex-1 bg-slate-800/40 border border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-2xl font-medium text-sm flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-900/20"
          >
            Gửi <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
