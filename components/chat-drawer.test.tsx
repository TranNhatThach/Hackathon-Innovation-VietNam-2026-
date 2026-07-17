import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatDrawer } from "@/components/chat-drawer";

describe("ChatDrawer", () => {
  it("thể hiện rõ ba chế độ và chuyển sang ngữ cảnh bệnh nhân", () => {
    render(<ChatDrawer open onClose={vi.fn()}/>);
    expect(screen.getByRole("tab", { name: "Quy trình" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Bệnh nhân" }));
    expect(screen.getByText(/Đang tra cứu: A024/)).toBeInTheDocument();
    expect(screen.getByText("Ngữ cảnh bắt buộc")).toBeInTheDocument();
  });

  it("đóng drawer bằng nút có nhãn truy cập", () => {
    const close = vi.fn();
    render(<ChatDrawer open onClose={close}/>);
    fireEvent.click(screen.getAllByRole("button", { name: "Đóng trợ lý" })[0]);
    expect(close).toHaveBeenCalledOnce();
  });
});
