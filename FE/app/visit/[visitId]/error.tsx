"use client";
export default function Error({ reset }: { reset: () => void }) { return <main className="page-loader" role="alert"><strong>Không thể mở lượt khám.</strong><button className="button button--primary" onClick={reset}>Thử lại</button></main>; }
