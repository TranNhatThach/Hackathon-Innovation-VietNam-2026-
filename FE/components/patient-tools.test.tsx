import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppointmentLookup, MedicationList } from "@/components/patient/patient-tools";
import { fictionalAppointment, fictionalMedications } from "@/lib/mock-data";

describe("patient prototype components", () => {
  it("shows a stored appointment after lookup", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ appointment_code: "HEN-260717-042", scheduled_at: "2026-07-17T09:30:00", status: "Đã xác nhận", facility: "Bệnh viện Tim Hà Nội - Cơ sở 1", department: "Phòng khám Tim mạch tổng quát", doctor: "BS. Nguyễn Minh Anh", visit_type: "Khám lần đầu", payment_type: "BHYT" }),
    }));
    render(<AppointmentLookup appointment={fictionalAppointment}/>);
    fireEvent.change(screen.getByPlaceholderText("Số điện thoại đã dùng khi đặt lịch"), { target: { value: "0987 000 042" } });
    fireEvent.change(screen.getByPlaceholderText("Ví dụ: HEN-260717-ABC123"), { target: { value: "HEN-260717-042" } });
    fireEvent.click(screen.getByRole("button", { name: "Tra cứu lịch khám" }));
    expect(await screen.findByText("HEN-260717-042")).toBeInTheDocument();
    expect(await screen.findByText("Phòng khám Tim mạch tổng quát")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("records a medication response only in the UI", () => {
    render(<MedicationList medications={[fictionalMedications[0]]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Đã uống" }));
    expect(screen.getAllByText("Đã uống").length).toBeGreaterThan(1);
  });

  it("shows appointment history using only the phone number", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ appointment_code: "HEN-260717-HISTORY", scheduled_at: "2026-07-21T09:00:00", status: "Chờ xác nhận", facility: "Bệnh viện Tim Hà Nội - Cơ sở 1", department: "Phòng khám Tim mạch tổng quát", doctor: null, visit_type: "Yêu cầu đặt lịch trực tuyến", payment_type: "BHYT" }], total: 1, page: 1, total_pages: 1 }),
    }));
    render(<AppointmentLookup appointment={fictionalAppointment}/>);
    fireEvent.change(screen.getByPlaceholderText("Số điện thoại đã dùng khi đặt lịch"), { target: { value: "0377325390" } });
    fireEvent.click(screen.getByRole("button", { name: "Xem lịch sử đặt lịch" }));
    expect(await screen.findByText(/HEN-260717-HISTORY/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
