import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Xin chào! Tôi là Trợ lý AI đồng hành cùng bạn tại Vietnam AI Innovation Challenge 2026. Tôi có thể giúp gì cho bạn hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Prepare message for streaming response
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
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

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: !done });
        
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex].content += chunk;
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex].content = 'Có lỗi xảy ra khi kết nối tới Server AI. Vui lòng kiểm tra lại cấu hình API key.';
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-1.5">
              ADK Agent Stack
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium">ADK 2.0</span>
            </h3>
            <p className="text-xs text-slate-400">Powered by FPT AI Factory</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-cyan-400" /> Secure Sandbox</span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-3`}
          >
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
              }`}
            >
              {msg.content === '' && loading ? (
                <div className="flex items-center space-x-1.5 py-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                </div>
              ) : (
                <p className="whitespace-pre-line">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-cyan-400" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950/30 border-t border-slate-800/80">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi tại đây..."
            className="flex-1 bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm flex items-center gap-1.5 transition-colors shadow-lg shadow-violet-900/30"
          >
            Gửi <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
