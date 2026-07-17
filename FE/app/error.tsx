"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <main className="page-loader" role="alert"><strong>Không thể tải trang</strong><span>Đã xảy ra lỗi trong giao diện mô phỏng.</span><button className="button button--primary" onClick={reset}>Thử lại</button></main>;
}
