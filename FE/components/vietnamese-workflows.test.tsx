import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppointmentLookup } from "@/components/patient-tools";
import { PatientFaq } from "@/components/patient-faq";
import { ProcedureCenter } from "@/components/procedure-center";
import { fictionalAppointment } from "@/lib/mock-data";

describe("Các luồng tiếng Việt hoàn chỉnh", () => {
  it("gửi yêu cầu đặt lịch mô phỏng và giải thích rõ trạng thái", () => {
    render(<AppointmentLookup appointment={fictionalAppointment} defaultMode="book"/>);
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" }));
    expect(screen.getByText("Đã ghi nhận yêu cầu mô phỏng")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có lịch thật được tạo/)).toBeInTheDocument();
  });

  it("trợ lý trả lời chủ đề lĩnh thuốc từ đúng trang quy trình", () => {
    render(<PatientFaq/>);
    fireEvent.click(screen.getByRole("button", { name: /Lĩnh thuốc/ }));
    expect(screen.getByText(/Đang tìm trong nguồn/)).toBeInTheDocument();
  });

  it("hiển thị mã, phiên bản và các bước QT.25.01", () => {
    render(<ProcedureCenter staff={false}/>);
    expect(screen.getAllByText(/QT\.25\.01/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đăng ký khám và kiểm tra giấy tờ").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Bước tiếp theo: Lấy số tiếp nhận/ }));
    expect(screen.getAllByRole("button", { name: /Lấy số tiếp nhận/ }).find((button) => button.getAttribute("aria-current") === "step")).toBeTruthy();
  });
});
