import { Icon } from "@/components/icon";
import type { IconName, LoadState } from "@/types";

export function Button({ children, variant = "primary", icon, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName }) {
  return <button className={`button button--${variant} ${className}`} {...props}>{icon && <Icon name={icon} size={18} />}<span>{children}</span></button>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function StateView({ state, emptyText = "Chưa có dữ liệu.", onRetry }: { state: Exclude<LoadState, "ready">; emptyText?: string; onRetry?: () => void }) {
  if (state === "loading") return <div className="state-card" role="status"><div className="spinner" /><strong>Đang đồng bộ dữ liệu</strong><span>Vui lòng đợi trong giây lát.</span></div>;
  if (state === "error") return <div className="state-card state-card--error" role="alert"><span className="state-icon"><Icon name="alert" /></span><strong>Không thể tải dữ liệu</strong><span>Kết nối mô phỏng đang gián đoạn. Vui lòng thử lại.</span>{onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>Thử lại</Button>}</div>;
  return <div className="state-card"><span className="state-icon"><Icon name="file" /></span><strong>{emptyText}</strong><span>Hãy điều chỉnh bộ lọc hoặc quay lại sau.</span></div>;
}

export function DemoStateControl({ state, setState }: { state: LoadState; setState: (state: LoadState) => void }) {
  return <label className="demo-control"><span>Mô phỏng trạng thái</span><select value={state} onChange={(event) => setState(event.target.value as LoadState)}><option value="ready">Có dữ liệu</option><option value="loading">Đang tải</option><option value="empty">Không có dữ liệu</option><option value="error">Có lỗi</option></select></label>;
}
