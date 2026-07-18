"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button } from "@/components/shared/ui";
import { Icon } from "@/components/shared/icon";
import { analyticsSnapshots, chatbotIntents, hmsStages, integrationSignals, type AnalyticsPeriod } from "@/lib/analytics-data";

const percent = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;

export function StaffAnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("today");
  const [notice, setNotice] = useState("");
  const snapshot = analyticsSnapshots[period];
  const metrics = useMemo(() => [
    { label: "Lượt HMS được theo dõi", value: snapshot.trackedVisits.toLocaleString("vi-VN"), detail: `${snapshot.completedVisits.toLocaleString("vi-VN")} lượt đã hoàn tất`, icon: "users" as const, tone: "blue" },
    { label: "Tự phục vụ qua chatbot", value: `${percent(snapshot.selfServed, snapshot.conversations)}%`, detail: `${snapshot.selfServed}/${snapshot.conversations} hội thoại không cần chuyển người`, icon: "bot" as const, tone: "green" },
    { label: "Câu trả lời có nguồn", value: `${percent(snapshot.groundedAnswers, snapshot.conversations)}%`, detail: `${snapshot.groundedAnswers}/${snapshot.conversations} câu trả lời dẫn nguồn`, icon: "book" as const, tone: "blue" },
    { label: "Chuyển sang nhân viên", value: `${percent(snapshot.handoffs, snapshot.conversations)}%`, detail: `${snapshot.handoffs}/${snapshot.conversations} hội thoại cần hỗ trợ`, icon: "user" as const, tone: "amber" },
    { label: "Đáp ứng thời hạn xử lý", value: `${percent(snapshot.slaMet, snapshot.resolvedCases)}%`, detail: `${snapshot.slaMet}/${snapshot.resolvedCases} yêu cầu đã xử lý`, icon: "clock" as const, tone: "green" },
    { label: "Phản hồi chatbot trung vị", value: `${snapshot.medianResponseSeconds.toLocaleString("vi-VN")} giây`, detail: "Từ lúc gửi câu hỏi đến lúc hiển thị trả lời", icon: "message" as const, tone: "violet" },
  ], [snapshot]);

  const funnel = [
    { label: "Hội thoại bắt đầu", value: snapshot.conversations, tone: "blue" },
    { label: "Trả lời có nguồn", value: snapshot.groundedAnswers, tone: "cyan" },
    { label: "Tự giải quyết", value: snapshot.selfServed, tone: "green" },
    { label: "Chuyển nhân viên", value: snapshot.handoffs, tone: "amber" },
  ];

  return <div className="analytics-dashboard">
    <div className="staff-page-heading analytics-heading"><div><span className="breadcrumb">Vận hành <Icon name="chevron" size={13}/> Phân tích HMS và chatbot</span><h1>Hiệu quả vận hành và trợ lý</h1><p>Theo dõi hành trình người bệnh, mức tự phục vụ và chất lượng chuyển giao sang nhân viên.</p></div><div className="heading-actions"><label className="analytics-period"><span>Khoảng thời gian</span><select value={period} onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}><option value="today">Hôm nay</option><option value="7d">7 ngày</option><option value="30d">30 ngày</option></select></label><Button variant="secondary" icon="refresh" onClick={() => setNotice(`Đã làm mới dữ liệu mô phỏng lúc ${snapshot.updatedAt}.`)}>Làm mới</Button></div></div>

    <section className="analytics-data-note" aria-label="Phạm vi dữ liệu"><Icon name="shield"/><div><strong>Dữ liệu mô phỏng để thống nhất cách đo</strong><p>Chưa kết nối HMS hoặc nhật ký chatbot thật. Mỗi chỉ số bên dưới hiển thị cách tính và không được dùng làm báo cáo bệnh viện.</p></div><span>Cập nhật {snapshot.updatedAt}</span></section>
    {notice && <div className="workflow-feedback" role="status"><Icon name="check"/><span>{notice}</span><button aria-label="Đóng thông báo" onClick={() => setNotice("")}><Icon name="close" size={15}/></button></div>}

    <section className="analytics-kpis" aria-label="Các chỉ số chính">{metrics.map((metric) => <article key={metric.label}><span className={`analytics-kpi-icon ${metric.tone}`}><Icon name={metric.icon}/></span><div><small>{metric.label}</small><strong>{metric.value}</strong><p>{metric.detail}</p></div></article>)}</section>

    <div className="analytics-dashboard-grid">
      <section className="analytics-panel analytics-panel--funnel"><header><div><span className="analytics-panel-label">CHATBOT</span><h2>Phễu hỗ trợ người bệnh</h2><p>Từ hội thoại đến tự giải quyết hoặc chuyển nhân viên.</p></div><Icon name="chart"/></header><div className="analytics-funnel">{funnel.map((item) => <div key={item.label}><span><b>{item.label}</b><small>{percent(item.value, snapshot.conversations)}%</small></span><i><b className={item.tone} style={{ width: `${Math.max(percent(item.value, snapshot.conversations), 4)}%` }}/></i><strong>{item.value.toLocaleString("vi-VN")}</strong></div>)}</div><footer><Icon name="help" size={15}/> Tự giải quyết = người dùng nhận câu trả lời có nguồn và không tạo yêu cầu nhân viên trong cùng phiên.</footer></section>

      <section className="analytics-panel"><header><div><span className="analytics-panel-label">HMS</span><h2>Thời gian chờ theo công đoạn</h2><p>So sánh trung vị mô phỏng với ngưỡng theo dõi nội bộ.</p></div><Link href="/staff/operations">Mở điều phối <Icon name="arrow" size={14}/></Link></header><div className="hms-stage-table" role="table" aria-label="Thời gian chờ HMS"><div className="hms-stage-row hms-stage-head" role="row"><span>Công đoạn</span><span>Lượt</span><span>Chờ trung vị</span><span>Trạng thái</span></div>{hmsStages.map((stage) => { const delayed = stage.medianWait > stage.threshold; return <div className="hms-stage-row" role="row" key={stage.stage}><strong>{stage.stage}</strong><span>{stage.visits}</span><span>{stage.medianWait} phút <small>/ ngưỡng {stage.threshold}</small></span><Badge tone={delayed ? "warning" : "success"}>{delayed ? "Cần kiểm tra" : "Trong ngưỡng"}</Badge></div>; })}</div></section>

      <section className="analytics-panel analytics-panel--wide"><header><div><span className="analytics-panel-label">NHU CẦU CHATBOT</span><h2>Chủ đề hỏi nhiều và kết quả hỗ trợ</h2><p>Giúp ưu tiên nội dung, quy trình và năng lực nhân viên.</p></div><Link href="/staff/human-in-loop">Xem yêu cầu chuyển giao <Icon name="arrow" size={14}/></Link></header><div className="intent-table-wrap"><table className="intent-table"><thead><tr><th>Chủ đề</th><th>Hội thoại</th><th>Tự phục vụ</th><th>Chuyển nhân viên</th><th>Đánh giá hữu ích</th></tr></thead><tbody>{chatbotIntents.map((intent) => <tr key={intent.intent}><th>{intent.intent}</th><td>{intent.conversations}</td><td><span className="rate-cell"><i><b style={{ width: `${intent.selfServiceRate}%` }}/></i>{intent.selfServiceRate}%</span></td><td><Badge tone={intent.handoffRate >= 30 ? "warning" : "neutral"}>{intent.handoffRate}%</Badge></td><td>{intent.helpfulRate}%</td></tr>)}</tbody></table></div></section>

      <section className="analytics-panel"><header><div><span className="analytics-panel-label">TÍCH HỢP</span><h2>Tín hiệu chất lượng dữ liệu</h2><p>Độ sẵn có và độ trễ của từng nguồn mô phỏng.</p></div><Icon name="shield"/></header><div className="integration-list">{integrationSignals.map((signal) => <article key={signal.name}><span className={signal.availability >= 99 ? "integration-dot good" : "integration-dot watch"}/><div><strong>{signal.name}</strong><small>Độ trễ: {signal.delay}</small></div><span><b>{signal.availability}%</b><small>{signal.status}</small></span></article>)}</div><p className="coverage-note"><Icon name="file" size={15}/> Độ phủ bản ghi HMS: <strong>{percent(snapshot.syncedRecords, snapshot.expectedRecords)}%</strong> ({snapshot.syncedRecords}/{snapshot.expectedRecords}).</p></section>

      <section className="analytics-panel"><header><div><span className="analytics-panel-label">HÀNH ĐỘNG ĐỀ XUẤT</span><h2>Điểm cần ưu tiên hôm nay</h2><p>Chỉ là gợi ý vận hành, cần nhân viên xác minh.</p></div><Icon name="alert"/></header><ol className="analytics-insights"><li><span>1</span><p><strong>Kiểm tra khu cận lâm sàng</strong><small>Chờ trung vị 31 phút, cao hơn ngưỡng mô phỏng 11 phút.</small></p><Link href="/staff/operations">Xem lượt</Link></li><li><span>2</span><p><strong>Cải thiện luồng đổi lịch</strong><small>31% hội thoại về lịch khám phải chuyển sang nhân viên.</small></p><Link href="/staff/human-in-loop">Xem yêu cầu</Link></li><li><span>3</span><p><strong>Bổ sung nội dung ngoài phạm vi</strong><small>Đánh giá hữu ích chỉ 66%; cần rà nguồn trước khi mở rộng trả lời.</small></p><Link href="/staff/procedures">Rà quy trình</Link></li></ol></section>
    </div>

    <section className="analytics-definitions"><header><Icon name="book"/><div><h2>Định nghĩa và giới hạn chỉ số</h2><p>Các định nghĩa cần được bệnh viện phê duyệt trước khi kết nối dữ liệu thật.</p></div></header><dl><div><dt>Tỷ lệ tự phục vụ</dt><dd>Hội thoại không tạo yêu cầu nhân viên ÷ tổng hội thoại hợp lệ.</dd></div><div><dt>Câu trả lời có nguồn</dt><dd>Câu trả lời gắn tài liệu đã duyệt ÷ tổng câu trả lời chatbot.</dd></div><div><dt>Tỷ lệ chuyển nhân viên</dt><dd>Hội thoại tạo hoặc gắn vào yêu cầu hỗ trợ ÷ tổng hội thoại hợp lệ.</dd></div><div><dt>Đáp ứng thời hạn</dt><dd>Yêu cầu đóng trước thời hạn mô phỏng ÷ tổng yêu cầu đã giải quyết.</dd></div><div><dt>Thời gian chờ HMS</dt><dd>Trung vị thời gian từ lúc vào đến lúc rời một công đoạn; không phải thời gian khám lâm sàng.</dd></div><div><dt>Độ phủ dữ liệu</dt><dd>Bản ghi nhận được ÷ bản ghi dự kiến trong cùng khoảng thời gian.</dd></div></dl></section>
  </div>;
}
