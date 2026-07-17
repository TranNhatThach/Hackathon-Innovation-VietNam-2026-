"use client";

import { Button } from "@/components/ui";

export default function StaffError({ reset }: { reset: () => void }) {
  return <div className="state-card state-card--error" role="alert"><strong>Không thể mở không gian vận hành.</strong><span>Dữ liệu mô phỏng tạm thời không khả dụng.</span><Button variant="secondary" onClick={reset}>Thử lại</Button></div>;
}
