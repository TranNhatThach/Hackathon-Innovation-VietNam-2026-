import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, StateView } from "@/components/shared/ui";

describe("shared UI", () => {
  it("renders an accessible button and handles clicks", () => {
    const onClick = vi.fn();
    render(<Button icon="calendar" onClick={onClick}>Đặt lịch khám</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Đặt lịch khám" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("announces errors and retries", () => {
    const onRetry = vi.fn();
    render(<StateView state="error" onRetry={onRetry}/>);
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể tải dữ liệu");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders a loading status", () => {
    render(<StateView state="loading"/>);
    expect(screen.getByRole("status")).toHaveTextContent("Đang đồng bộ dữ liệu");
  });
});
