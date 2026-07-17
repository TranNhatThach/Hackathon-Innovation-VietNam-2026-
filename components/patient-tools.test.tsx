import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppointmentLookup, MedicationList } from "@/components/patient-tools";
import { fictionalAppointment, fictionalMedications } from "@/lib/mock-data";

describe("patient prototype components", () => {
  it("shows a fictional appointment after lookup", () => {
    render(<AppointmentLookup appointment={fictionalAppointment}/>);
    fireEvent.click(screen.getByRole("button", { name: "Tra cứu lịch khám" }));
    expect(screen.getByText("HEN-260717-042")).toBeInTheDocument();
    expect(screen.getByText("Phòng khám Tim mạch tổng quát")).toBeInTheDocument();
  });

  it("records a medication response only in the UI", () => {
    render(<MedicationList medications={[fictionalMedications[0]]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Đã uống" }));
    expect(screen.getAllByText("Đã uống").length).toBeGreaterThan(1);
  });
});
