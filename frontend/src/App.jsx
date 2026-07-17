import React from 'react';
import ChatInterface from './components/chat-interface';
import { Heart, Phone, MapPin, Activity } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 md:p-8">
      {/* Hospital Brand Header */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-600/20 border border-rose-500/40 rounded-2xl animate-pulse">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500/10" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-rose-400 via-slate-100 to-slate-300 bg-clip-text text-transparent uppercase">
              Bệnh viện Tim Hà Nội
            </h1>
            <p className="text-xs text-rose-400/80 font-semibold uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Hanoi Heart Hospital
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-rose-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Trợ lý AI Đang hoạt động</span>
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="w-full flex-1 flex flex-col items-center justify-center gap-6 my-2">
        <div className="text-center max-w-xl space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Cổng Hỗ Trợ & Chăm Sóc Khách Hàng Tự Động
          </h2>
          <p className="text-slate-400 text-xs md:text-sm">
            Giải đáp tự động các thông tin đặt lịch, quy trình khám bệnh, bảng giá dịch vụ, thủ tục BHYT và hỗ trợ hướng dẫn cấp cứu khẩn cấp.
          </p>
        </div>

        {/* Chat Component */}
        <ChatInterface />

        {/* Official Hospital Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mt-2">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-start space-x-3.5">
            <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-200">Địa chỉ liên hệ</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                <strong>Cơ sở 1:</strong> 92 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội<br />
                <strong>Cơ sở 2:</strong> Đường Võ Chí Công, Tây Hồ, Hà Nội
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-start space-x-3.5">
            <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-200">Đường dây nóng hỗ trợ</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                <strong>Đặt lịch khám & CSKH:</strong> <span className="text-slate-100 font-semibold">1900 1234</span> (7:30 - 17:00)<br />
                <strong>Khoa Cấp cứu (24/7):</strong> <span className="text-rose-400 font-bold">0243.8248362</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mt-8 border-t border-slate-900/60 pt-4 text-center text-xs text-slate-500">
        <p>© 2026 Bệnh viện Tim Hà Nội. Phát triển phục vụ cuộc thi Vietnam AI Innovation Challenge 2026.</p>
      </footer>
    </div>
  );
}

export default App;
