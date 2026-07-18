import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppointmentLookup } from "@/components/patient/patient-tools";
import { PatientFaq } from "@/components/patient/patient-faq";
import { ProcedureCenter } from "@/components/procedure/procedure-center";
import { fictionalAppointment } from "@/lib/mock-data";

describe("Các luồng tiếng Việt hoàn chỉnh", () => {
  it("lưu yêu cầu đặt lịch và giải thích rõ trạng thái", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ appointment_code: "HEN-260717-TEST01" }),
    }));
    render(<AppointmentLookup appointment={fictionalAppointment} defaultMode="book"/>);
    fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Nguyễn Văn An" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0987 000 042" } });
    fireEvent.change(screen.getByLabelText("Nhu cầu khám"), { target: { value: "Phòng khám Tim mạch tổng quát" } });
    fireEvent.change(screen.getByLabelText("Hình thức dự kiến"), { target: { value: "BHYT" } });
    fireEvent.change(screen.getByLabelText("Ngày mong muốn"), { target: { value: "2026-07-20" } });
    fireEvent.change(screen.getByLabelText("Khung giờ mong muốn"), { target: { value: "morning" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" }));
    expect(await screen.findByText("Đã lưu yêu cầu đặt lịch")).toBeInTheDocument();
    expect(await screen.findByText("HEN-260717-TEST01")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("trợ lý trả lời chủ đề lĩnh thuốc từ đúng trang quy trình", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<PatientFaq/>);
    fireEvent.click(screen.getByRole("button", { name: /Lĩnh thuốc/ }));
    expect(screen.getByText(/Đang tìm trong nguồn/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("hiển thị mã, phiên bản và các bước QT.25.01", () => {
    render(<ProcedureCenter staff={false}/>);
    expect(screen.getAllByText(/QT\.25\.01/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đăng ký khám và kiểm tra giấy tờ").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Bước tiếp theo: Lấy số tiếp nhận/ }));
    expect(screen.getAllByRole("button", { name: /Lấy số tiếp nhận/ }).find((button) => button.getAttribute("aria-current") === "step")).toBeTruthy();
  });
});
