export interface ProcedureStep {
  id: string;
  order: number;
  title: string;
  sourcePages: string;
  patientInstruction: string;
  responsibleRole: string;
  staffActions: string[];
  note?: string;
}

export const procedureMeta = {
  title: "Quy trình khám và điều trị ngoại trú tại Khu Khám bệnh Tự nguyện 1",
  code: "QT.25.01",
  issue: "Lần ban hành 01",
  effectiveDate: "01/07/2026",
  sourceUrl: "/documents/QT.25.01.pdf",
};

const steps: Array<[string, string, string, string]> = [
  ["dat-lich", "Đăng ký khám và kiểm tra giấy tờ", "Gửi yêu cầu đặt lịch và chuẩn bị giấy tờ cần thiết.", "Tiếp nhận, kiểm tra nhu cầu và xác nhận lịch."],
  ["tiep-don", "Lấy số tiếp nhận", "Đến quầy tiếp đón theo thời gian được xác nhận để lấy số.", "Đối chiếu lịch hẹn và cấp số tiếp nhận."],
  ["dang-ky", "Đăng ký khám", "Xuất trình giấy tờ cần thiết và nhận số thứ tự.", "Tạo lượt khám và kiểm tra thông tin hành chính."],
  ["bhyt-thu-phi", "BHYT và thu phí", "Kiểm tra quyền lợi BHYT và hoàn tất khoản phí được thông báo.", "Xác minh BHYT, giải thích và ghi nhận thanh toán."],
  ["sinh-hieu", "Đo sinh hiệu", "Di chuyển đến khu đo sinh hiệu khi được hướng dẫn.", "Đo, ghi nhận và chuyển người bệnh sang khu chờ khám."],
  ["kham-bac-si", "Khám bác sĩ", "Chờ gọi số và trao đổi trực tiếp với bác sĩ.", "Khám, đánh giá và chỉ định bước tiếp theo."],
  ["can-lam-sang", "Cận lâm sàng", "Thực hiện xét nghiệm hoặc chẩn đoán theo phiếu chỉ định.", "Hướng dẫn vị trí, kiểm tra chỉ định và trả kết quả."],
  ["nhan-ket-qua", "Nhận kết quả", "Quay lại phòng khám theo hướng dẫn sau khi có kết quả.", "Tổng hợp kết quả và hướng dẫn kế hoạch tiếp theo."],
  ["nhan-thuoc", "Nhận thuốc và hoàn tất", "Nhận thuốc theo đơn và kiểm tra hướng dẫn sử dụng.", "Đối chiếu đơn, cấp thuốc và hoàn tất lượt khám."],
];

export const procedureSteps: ProcedureStep[] = steps.map(([id, title, patientInstruction, staffAction], index) => ({
  id, title, patientInstruction, order: index + 1, sourcePages: `Trang ${index + 1}`,
  responsibleRole: "Nhân viên phụ trách công đoạn",
  staffActions: [staffAction, "Xác nhận trạng thái trước khi chuyển bước."],
  note: index === 3 ? "Mức hưởng và chi phí cần được nhân viên xác nhận theo hồ sơ thực tế." : undefined,
}));
