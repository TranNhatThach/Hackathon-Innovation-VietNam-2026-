import type {
  Appointment,
  DashboardMetric,
  HumanCase,
  KanbanColumn,
  Medication,
  QuickAction,
  Visit,
  VisitCompanion,
} from "@/types";

export const quickActions: QuickAction[] = [
  { title: "Đặt lịch khám", description: "Gửi yêu cầu và tra cứu lịch hẹn", icon: "calendar", href: "/appointments" },
  { title: "Làm thủ tục", description: "Chuẩn bị giấy tờ trước khi đến viện", icon: "file", href: "/check-in" },
  { title: "Theo dõi lượt khám", description: "Xem số thứ tự và bước hiện tại", icon: "route", href: "/visit/VISIT-001" },
  { title: "Xem quy trình", description: "Hướng dẫn hành trình khám bệnh", icon: "help", href: "/procedures" },
];

export const fictionalAppointment: Appointment = {
  id: "HEN-260717-042", date: "17/07/2026", time: "09:30", facility: "Bệnh viện Tim Hà Nội - Cơ sở 1",
  department: "Phòng khám Tim mạch tổng quát", doctor: "BS. Nguyễn Minh Anh", patientDisplayName: "Nguyễn Văn An",
  visitType: "Khám lần đầu", paymentType: "BHYT", status: "Đã xác nhận",
  documents: [{ label: "Căn cước công dân", ready: true }, { label: "Thẻ BHYT", ready: true }, { label: "Giấy chuyển tuyến (nếu có)", ready: false }],
};

export const fictionalMedications: Medication[] = [
  { id: "MED-001", name: "Cardioval 5 mg", dosage: "1 viên", schedule: "Sau ăn sáng", instruction: "Dùng theo đơn đã được bác sĩ duyệt.", period: "17/07–31/07/2026", status: "Sắp đến giờ", time: "08:00", approvedBy: "BS. Nguyễn Minh Anh" },
  { id: "MED-002", name: "Aspirin 81 mg", dosage: "1 viên", schedule: "Sau ăn tối", instruction: "Không tự ý thay đổi liều.", period: "17/07–31/07/2026", status: "Chưa phản hồi", time: "20:00", approvedBy: "BS. Nguyễn Minh Anh" },
];

export const visitCompanion: VisitCompanion = {
  visitId: "VISIT-001", patientDisplayName: "Nguyễn Văn An", queueNumber: "A024", currentStage: "Chờ thanh toán",
  location: "Quầy thu ngân số 03", floor: "Tầng 1 · Khu nhà A", peopleAhead: 3, lastUpdated: "10:24",
  instructions: ["Chuẩn bị phiếu chỉ định", "Giữ số thứ tự A024", "Kiểm tra thông tin trước khi thanh toán"],
  journey: [
    { id: "ARRIVED", label: "Đã đến viện", status: "done" },
    { id: "REGISTRATION", label: "Đăng ký", status: "done" },
    { id: "PAYMENT", label: "Thanh toán", status: "current" },
    { id: "VITALS", label: "Đo sinh hiệu", status: "upcoming" },
    { id: "WAITING_DOCTOR", label: "Chờ bác sĩ", status: "upcoming" },
    { id: "CONSULTATION", label: "Khám bác sĩ", status: "upcoming" },
    { id: "TESTS", label: "Cận lâm sàng", status: "upcoming" },
    { id: "RESULTS", label: "Nhận kết quả", status: "upcoming" },
    { id: "PHARMACY", label: "Nhận thuốc", status: "upcoming" },
  ],
};

export const kanbanColumns: KanbanColumn[] = [
  { id: "REGISTRATION", label: "Đăng ký", shortLabel: "Đăng ký" },
  { id: "PAYMENT", label: "Thanh toán", shortLabel: "Thanh toán" },
  { id: "VITALS", label: "Đo sinh hiệu", shortLabel: "Sinh hiệu" },
  { id: "WAITING_DOCTOR", label: "Chờ bác sĩ", shortLabel: "Chờ bác sĩ" },
  { id: "CONSULTATION", label: "Đang khám", shortLabel: "Đang khám" },
  { id: "COMPLETED", label: "Hoàn tất", shortLabel: "Hoàn tất" },
];

export const visits: Visit[] = [
  { id: "VISIT-001", patientName: "Nguyễn Văn An", queueNumber: "A024", stage: "PAYMENT", stageLabel: "Chờ thanh toán", enteredAt: "10:05", waitMinutes: 19, room: "Quầy 03", paymentType: "BHYT", paymentStatus: "Chờ thanh toán", priority: "Bình thường", alerts: [], nextAction: "Thanh toán và đến khu đo sinh hiệu" },
  { id: "VISIT-002", patientName: "Trần Thị Bình", queueNumber: "B011", stage: "WAITING_DOCTOR", stageLabel: "Chờ bác sĩ", enteredAt: "09:35", waitMinutes: 49, room: "Phòng 201", doctor: "BS. Lê Hoàng", paymentType: "BHYT", paymentStatus: "Đã thanh toán", priority: "Ưu tiên", alerts: ["Thời gian chờ vượt ngưỡng mô phỏng"], nextAction: "Xác minh vị trí và báo điều phối" },
  { id: "VISIT-003", patientName: "Lê Văn Cường", queueNumber: "A031", stage: "REGISTRATION", stageLabel: "Đăng ký", enteredAt: "10:15", waitMinutes: 9, room: "Quầy 01", paymentType: "Dịch vụ", paymentStatus: "Chờ thanh toán", priority: "Bình thường", alerts: [], nextAction: "Hoàn tất đăng ký" },
  { id: "VISIT-004", patientName: "Phạm Minh Đức", queueNumber: "C008", stage: "CONSULTATION", stageLabel: "Đang khám", enteredAt: "10:10", waitMinutes: 14, room: "Phòng 204", doctor: "BS. Hà Anh", paymentType: "BHYT", paymentStatus: "Đã thanh toán", priority: "Bình thường", alerts: [], nextAction: "Chờ chỉ định tiếp theo" },
];

export const humanCases: HumanCase[] = [
  { id: "CASE-2406", patientName: "Trần Thị Bình", type: "Hỗ trợ tại viện", trigger: "Người bệnh chờ lâu và cần xác minh vị trí.", priority: "P0", createdAt: "10:12", slaDue: "10:30", owner: null, status: "Mở" },
  { id: "CASE-2407", patientName: "Nguyễn Văn An", type: "Hỗ trợ thanh toán", trigger: "Cần giải thích bước thanh toán BHYT.", priority: "P2", createdAt: "10:18", slaDue: "11:20", owner: "Lan Anh", status: "Đang xử lý" },
  { id: "CASE-2408", patientName: "Lê Văn Cường", type: "Hướng dẫn thủ tục", trigger: "Thiếu giấy tờ trong bộ hồ sơ mô phỏng.", priority: "P3", createdAt: "09:50", slaDue: "11:45", owner: null, status: "Mở" },
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Case đang mở", value: "3", detail: "Trong hàng đợi hiện tại", tone: "neutral" },
  { label: "P0 chưa nhận", value: "1", detail: "Cần xử lý ngay", tone: "danger" },
  { label: "Sắp quá hạn", value: "1", detail: "Trong 30 phút tới", tone: "warning" },
  { label: "Đã giải quyết", value: "0", detail: "Trong phiên mô phỏng", tone: "success" },
];
