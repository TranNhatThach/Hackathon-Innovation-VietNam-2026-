"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { procedureMeta, procedureSteps } from "@/lib/procedure-data";

export function ProcedureCenter({ staff = false }: { staff?: boolean }) {
  const [activeStep, setActiveStep] = useState("dat-lich");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const initial = procedureSteps.some((step) => step.id === hash) ? hash : "dat-lich";
    setActiveStep(initial);
    const alignHash = () => { const node = hash ? document.getElementById(hash) : null; if (node && typeof node.scrollIntoView === "function") node.scrollIntoView({ block: "start" }); };
    const frame = window.requestAnimationFrame(alignHash);
    const timer = window.setTimeout(alignHash, 500);

    if (typeof IntersectionObserver === "undefined") return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveStep(visible.target.id);
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.25, 0.6] });
    procedureSteps.forEach((step) => { const node = document.getElementById(step.id); if (node) observer.observe(node); });
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, []);

  const goTo = (id: string) => {
    setActiveStep(id);
    window.history.replaceState(null, "", `#${id}`);
    const node = document.getElementById(id);
    if (node && typeof node.scrollIntoView === "function") node.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <div className={staff ? "procedure-center procedure-center--staff" : "procedure-center"}>
    <section className="procedure-hero"><div className="procedure-hero__inner"><div className="procedure-hero__copy"><span className="eyebrow eyebrow--light">QUY TRÌNH ĐƯỢC ĐỐI CHIẾU</span><h1>{staff ? "Tra cứu quy trình khám ngoại trú" : "Hành trình khám tại Khu Tự nguyện 1"}</h1><p>{procedureMeta.title}</p><div className="procedure-meta"><span><Icon name="file" size={16}/> {procedureMeta.code}</span><span><Icon name="check" size={16}/> {procedureMeta.issue}</span><span><Icon name="calendar" size={16}/> Ban hành {procedureMeta.effectiveDate}</span></div></div><div className="procedure-actions"><a className="button button--light" href={procedureMeta.sourceUrl} target="_blank" rel="noreferrer"><Icon name="file"/> Mở văn bản nguồn</a>{staff ? <Link className="button procedure-action--outline" href="/staff/operations"><Icon name="kanban"/> Mở bảng điều phối</Link> : <Link className="button procedure-action--outline" href="/check-in"><Icon name="check"/> Xác nhận đến viện</Link>}</div></div></section>

    <div className={staff ? "procedure-layout" : "container procedure-layout"}>
      <aside className="procedure-index" aria-label="Mục lục quy trình"><div className="procedure-index__heading"><span><Icon name="route" size={18}/></span><div><strong>9 bước khám ngoại trú</strong><small>Chọn một bước để xem nhanh</small></div></div><nav aria-label="Các bước trong quy trình">{procedureSteps.map((step) => <button type="button" className={activeStep === step.id ? "is-active" : ""} aria-current={activeStep === step.id ? "step" : undefined} onClick={() => goTo(step.id)} key={step.id}><span>{String(step.order).padStart(2, "0")}</span><b>{step.title}</b></button>)}</nav><div className="procedure-safety"><Icon name="alert"/><p><strong>Khi có dấu hiệu bất thường</strong><small>Không chờ phản hồi trực tuyến. Báo nhân viên gần nhất; trường hợp khẩn cấp gọi 115.</small></p></div></aside>

      <main className="procedure-steps" aria-label="Nội dung quy trình"><section className="procedure-scope"><Icon name="shield"/><p><strong>Phạm vi áp dụng</strong><span>Khám và điều trị ngoại trú tại Khu Khám bệnh Tự nguyện 1 – Cơ sở 1. Đây là bản diễn giải dễ đọc; văn bản PDF là nguồn đối chiếu.</span></p></section>{procedureSteps.map((step, index) => <article id={step.id} className={activeStep === step.id ? "procedure-step-card is-active" : "procedure-step-card"} key={step.id}><div className="procedure-step-card__rail"><span className="procedure-number">{String(step.order).padStart(2, "0")}</span>{index < procedureSteps.length - 1 && <i/>}</div><div className="procedure-step-card__content"><header><div><span className="procedure-step-label">BƯỚC {step.order} / {procedureSteps.length}</span><h2>{step.title}</h2></div><span className="procedure-source"><Icon name="file" size={14}/> {procedureMeta.code} · {step.sourcePages}</span></header><section className="procedure-patient-action"><h3><Icon name="user" size={18}/>{staff ? "Hướng dẫn người bệnh" : "Bạn cần làm gì?"}</h3><p>{step.patientInstruction}</p></section>{staff && <section className="procedure-staff-action"><h3><Icon name="users" size={18}/>Trách nhiệm nhân viên</h3><p className="responsible-role"><Icon name="shield" size={15}/>{step.responsibleRole}</p><ul>{step.staffActions.map((action) => <li key={action}><Icon name="check" size={15}/><span>{action}</span></li>)}</ul></section>}{step.note && <div className="procedure-note"><Icon name="help" size={18}/><p><strong>Lưu ý</strong><span>{step.note}</span></p></div>}{index < procedureSteps.length - 1 && <button className="procedure-next" type="button" onClick={() => goTo(procedureSteps[index + 1].id)}>Bước tiếp theo: {procedureSteps[index + 1].title}<Icon name="arrow" size={16}/></button>}</div></article>)}</main>
    </div>
  </div>;
}
