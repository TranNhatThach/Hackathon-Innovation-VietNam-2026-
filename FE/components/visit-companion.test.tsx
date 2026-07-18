import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisitCompanionView } from "@/components/patient/visit-companion";
import { visitCompanion } from "@/lib/mock-data";

describe("VisitCompanionView", () => {
  it("hiển thị số thứ tự, vị trí và xác nhận đang đến", () => {
    render(<VisitCompanionView visit={visitCompanion}/>);
    expect(screen.getAllByText("A024").length).toBeGreaterThan(0);
    expect(screen.getByText("Quầy thu ngân số 03")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tôi đang đến quầy" }));
    expect(screen.getByRole("button", { name: "Đã xác nhận đang đến" })).toBeInTheDocument();
  });

  it("cho phép chuyển sang empty state trong demo", () => {
    render(<VisitCompanionView visit={visitCompanion}/>);
    fireEvent.change(screen.getByRole("combobox", { name: "Mô phỏng trạng thái" }), { target: { value: "empty" } });
    expect(screen.getByText("Chưa có lượt khám đang diễn ra.")).toBeInTheDocument();
  });
});
