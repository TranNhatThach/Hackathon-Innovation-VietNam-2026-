import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffAnalyticsDashboard } from "@/components/staff-analytics";

describe("StaffAnalyticsDashboard", () => {
  it("hiển thị chỉ số HMS, chatbot và công thức đo", () => {
    render(<StaffAnalyticsDashboard/>);
    expect(screen.getByText("Lượt HMS được theo dõi")).toBeInTheDocument();
    expect(screen.getByText("Tự phục vụ qua chatbot")).toBeInTheDocument();
    expect(screen.getByText("Tỷ lệ tự phục vụ")).toBeInTheDocument();
    expect(screen.getAllByText("72%").length).toBeGreaterThan(0);
  });

  it("cập nhật dashboard theo khoảng thời gian", () => {
    render(<StaffAnalyticsDashboard/>);
    fireEvent.change(screen.getByRole("combobox", { name: "Khoảng thời gian" }), { target: { value: "7d" } });
    expect(screen.getByText("1.840")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Làm mới" }));
    expect(screen.getByRole("status")).toHaveTextContent("Đã làm mới dữ liệu mô phỏng");
  });
});
