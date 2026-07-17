"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";

const topics = ["Giấy tờ khám BHYT", "Đặt lịch khám", "Quy trình khám lần đầu", "Lấy kết quả", "Lĩnh thuốc", "Chỉ đường trong viện"];

const answers = {
  "Giấy tờ khám BHYT": { intro: "Khi đăng ký khám BHYT, bạn nên chuẩn bị:", items: ["CCCD hoặc giấy tờ tùy thân hợp lệ.", "Thẻ BHYT, ứng dụng VssID hoặc CCCD gắn chip có tích hợp thông tin BHYT.", "Giấy chuyển tuyến hoặc giấy hẹn khám lại nếu trường hợp của bạn yêu cầu."], pages: "Trang 4–5", anchor: "dang-ky" },
  "Đặt lịch khám": { intro: "Bạn có thể đăng ký nhu cầu khám trước khi đến viện:", items: ["Liên hệ điện thoại, website hoặc trang mạng xã hội của bệnh viện.", "Chờ nhân viên xác nhận lịch; yêu cầu gửi trực tuyến chưa phải lịch hẹn chính thức.", "Khi đến, lấy số tiếp nhận tại máy phát số hoặc theo hướng dẫn của nhân viên."], pages: "Trang 4", anchor: "dat-lich" },
  "Quy trình khám lần đầu": { intro: "Các bước đầu của lượt khám ngoại trú gồm:", items: ["Lấy số tiếp nhận và đăng ký thông tin khám.", "Hoàn tất thủ tục BHYT, thu phí theo hướng dẫn.", "Đo dấu hiệu sinh tồn, sau đó nhận phòng khám và chờ gọi số."], pages: "Trang 4–6", anchor: "lay-so" },
  "Lấy kết quả": { intro: "Khi được chỉ định cận lâm sàng:", items: ["Nhận phiếu và hướng dẫn vị trí thực hiện từ nhân viên.", "Thực hiện theo số thứ tự tại từng khu vực.", "Kết quả được chuyển về khu khám; hỏi điều dưỡng nếu chưa rõ bước tiếp theo."], pages: "Trang 6", anchor: "kham-cls" },
  "Lĩnh thuốc": { intro: "Sau khi bác sĩ kết luận và kê đơn:", items: ["Hoàn tất duyệt BHYT hoặc thanh toán theo hướng dẫn.", "Đến quầy dược, xuất trình đơn và giấy tờ được yêu cầu.", "Kiểm tra thuốc, nghe hướng dẫn đã duyệt và ký nhận trước khi kết thúc."], pages: "Trang 8", anchor: "thuoc-ket-thuc" },
  "Chỉ đường trong viện": { intro: "Để đến đúng khu vực tiếp theo:", items: ["Giữ phiếu hướng dẫn có ghi số thứ tự và vị trí.", "Theo biển chỉ dẫn tại cơ sở và màn hình gọi số.", "Nếu chưa rõ, hỏi nhân viên hướng dẫn tại quầy gần nhất."], pages: "Trang 6", anchor: "kham-cls" },
} as const;

type Topic = keyof typeof answers;

export function PatientFaq() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic>("Giấy tờ khám BHYT");
  const [asked, setAsked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [support, setSupport] = useState(false);
  const ask = (text = query) => {
    if (!text.trim()) return;
    const matched = topics.find((item) => text.toLocaleLowerCase("vi").includes(item.toLocaleLowerCase("vi"))) as Topic | undefined;
    setQuery(text);
    setTopic(matched ?? (text.toLocaleLowerCase("vi").includes("thuốc") ? "Lĩnh thuốc" : text.toLocaleLowerCase("vi").includes("bảo hiểm") ? "Giấy tờ khám BHYT" : "Quy trình khám lần đầu"));
    setLoading(true);
    setAsked(false);
    setSupport(false);
    window.setTimeout(() => { setLoading(false); setAsked(true); }, 300);
  };
  const answer = answers[topic];
  return <div className="faq-page"><section className="faq-intro"><div className="container"><span className="faq-bot"><Icon name="bot" size={30}/></span><span className="eyebrow">TRỢ LÝ THÔNG TIN BỆNH VIỆN</span><h1>Xin chào, tôi có thể giúp gì cho bạn?</h1><p>Tra cứu quy trình đã được duyệt. Không dùng để chẩn đoán hoặc xử lý cấp cứu.</p></div></section><div className="container faq-layout"><section className="faq-chat" aria-live="polite"><div className="faq-chat__header"><div><span><Icon name="bot"/></span><p><strong>Trợ lý Bệnh viện Tim Hà Nội</strong><small><i/> Sẵn sàng hỗ trợ · Dữ liệu mô phỏng</small></p></div><Link className="icon-button" href="/procedures" aria-label="Mở quy trình"><Icon name="file"/></Link></div><div className="faq-messages"><div className="faq-message faq-message--assistant"><p>Tôi có thể giúp bạn tìm giấy tờ, lịch khám, quy trình và chỉ đường. Bạn muốn hỏi nội dung nào?</p><small>10:24</small></div>{loading && <div className="typing"><span/><span/><span/> Đang tìm trong nguồn đã được phê duyệt...</div>}{asked && <><div className="faq-message faq-message--user"><p>{query}</p></div><div className="faq-message faq-message--assistant answer-card"><p>{answer.intro}</p><ol>{answer.items.map((item) => <li key={item}>{item}</li>)}</ol><a className="source-card" href="/tai-lieu/quy-trinh-ngoai-tru-tn1-cs1-qt-25-01.pdf" target="_blank" rel="noreferrer"><Icon name="file"/><span><strong>Nguồn: QT.25.01 · {answer.pages}</strong><small>Quy trình ngoại trú Khu Tự nguyện 1, Cơ sở 1 · Ban hành 05/12/2024</small></span></a><div className="answer-actions"><Link className="button button--secondary" href={`/procedures#${answer.anchor}`}>Xem toàn bộ quy trình</Link><Button variant="ghost" onClick={() => setSupport(true)}>Liên hệ nhân viên</Button></div>{support && <p className="inline-feedback" role="status"><Icon name="check" size={15}/> Đã tạo yêu cầu mô phỏng HT-FAQ-018. Trong sản phẩm thật, yêu cầu sẽ được chuyển tới nhân viên.</p>}</div></>}</div><div className="faq-topics"><span>Gợi ý:</span>{topics.slice(0, 3).map((item) => <button key={item} onClick={() => ask(item)}>{item}</button>)}</div><form className="faq-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><label><span className="sr-only">Nhập câu hỏi</span><textarea rows={2} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: Khám BHYT cần mang giấy tờ gì?"/></label><Button type="submit" disabled={!query.trim() || loading} aria-label="Gửi câu hỏi"><Icon name="arrow"/></Button><small><Icon name="shield" size={14}/> Không nhập thông tin sức khỏe hoặc định danh thật.</small></form></section><aside className="faq-sidebar"><div className="portal-card"><h2>Chủ đề phổ biến</h2>{topics.map((item) => <button onClick={() => ask(item)} key={item}><span><Icon name={item.includes("BHYT") ? "shield" : item.includes("thuốc") ? "pill" : "file"}/>{item}</span><Icon name="chevron"/></button>)}</div><div className="emergency-mini"><Icon name="alert"/><h2>Đây không phải dịch vụ cấp cứu</h2><p>Nếu đau ngực dữ dội, khó thở hoặc mất ý thức, hãy gọi 115 ngay.</p><a href="tel:115" className="button button--danger"><Icon name="phone"/> Gọi 115</a></div></aside></div></div>;
}
