import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OperationsBoard } from "@/components/staff/operations-board";
import { HumanLoopDashboard } from "@/components/staff/human-loop-dashboard";
import { humanCases } from "@/lib/mock-data";

describe("staff workflows", () => {
  it("opens a visit context and records the next mock action", () => {
    render(<OperationsBoard/>);
    fireEvent.click(screen.getAllByRole("button", { name: "Xử lý" })[0]);
    expect(screen.getByRole("complementary", { name: /Xem nhanh lượt/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nhận xử lý" }));
    expect(screen.getAllByText(/Đã nhận xử lý lượt/).length).toBeGreaterThan(0);
  });

  it("assigns an unowned human case to the current coordinator", () => {
    render(<HumanLoopDashboard cases={humanCases}/>);
    fireEvent.click(screen.getAllByRole("button", { name: "+ Nhận case" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent("đã được phân công cho Lan Anh");
    expect(screen.getAllByText("Lan Anh").length).toBeGreaterThan(0);
  });

  it("lọc hàng đợi theo thời hạn xử lý thật", () => {
    render(<HumanLoopDashboard cases={humanCases}/>);
    fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo thời hạn xử lý" }), { target: { value: "soon" } });
    expect(screen.getByText("CASE-2406")).toBeInTheDocument();
    expect(screen.queryByText("CASE-2407")).not.toBeInTheDocument();
  });
});
