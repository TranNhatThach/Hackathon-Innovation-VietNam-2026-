import type { Appointment, DashboardMetric, HumanCase, JourneyStep, KanbanColumn, Medication, QuickAction, Visit, VisitCompanion } from "@/types";
export const journey:JourneyStep[]=[
 {id:"ARRIVED",label:"Đã check-in",status:"done"},{id:"REGISTRATION",label:"Đã đăng ký",status:"done"},{id:"PAYMENT",label:"Chờ thanh toán",status:"current"},{id:"VITALS",label:"Đo dấu hiệu sinh tồn",status:"upcoming"},{id:"WAITING_DOCTOR",label:"Chờ bác sĩ",status:"upcoming"},{id:"CONSULTATION",label:"Khám",status:"upcoming"},{id:"TESTS",label:"Cận lâm sàng",status:"upcoming"},{id:"RESULTS",label:"Quay lại bác sĩ",status:"upcoming"},{id:"PHARMACY",label:"Lĩnh thuốc",status:"upcoming"}
];
export const visits:Visit[]=[
 {id:"VISIT-001",patientName:"Nguyễn V. A.",queueNumber:"A024",stage:"WAITING_DOCTOR",stageLabel:"Chờ bác sĩ",enteredAt:"09:30",waitMinutes:32,room:"201",doctor:"BS. Trần Minh",paymentType:"BHYT",paymentStatus:"Đã thanh toán",priority:"Bình thường",alerts:["Sắp quá SLA"],nextAction:"Gọi bệnh nhân"},
 {id:"VISIT-002",patientName:"Phạm T. H.",queueNumber:"B011",stage:"INSURANCE",stageLabel:"Xác minh BHYT",enteredAt:"09:42",waitMinutes:20,room:"Quầy 04",paymentType:"BHYT",paymentStatus:"Chờ thanh toán",priority:"Bình thường",alerts:["Thiếu giấy tờ"],nextAction:"Kiểm tra giấy tờ"},
 {id:"VISIT-003",patientName:"Lê M. T.",queueNumber:"A019",stage:"CONSULTATION",stageLabel:"Đang khám",enteredAt:"09:55",waitMinutes:7,room:"203",doctor:"BS. Nguyễn An",paymentType:"Dịch vụ",paymentStatus:"Đã thanh toán",priority:"Ưu tiên",alerts:[],nextAction:"Chờ bác sĩ cập nhật"},
 {id:"VISIT-004",patientName:"Đỗ H. N.",queueNumber:"C007",stage:"TESTS",stageLabel:"Chờ cận lâm sàng",enteredAt:"09:08",waitMinutes:54,room:"P. Siêu âm 02",paymentType:"BHYT",paymentStatus:"Đã thanh toán",priority:"Bình thường",alerts:["Chờ lâu"],nextAction:"Xác nhận vị trí"},
 {id:"VISIT-005",patientName:"Vũ T. L.",queueNumber:"A031",stage:"ARRIVED",stageLabel:"Chờ check-in",enteredAt:"10:01",waitMinutes:3,paymentType:"Dịch vụ",paymentStatus:"Chờ thanh toán",priority:"Bình thường",alerts:[],nextAction:"Tiếp nhận"},
 {id:"VISIT-006",patientName:"Hoàng N. P.",queueNumber:"D014",stage:"PHARMACY",stageLabel:"Lĩnh thuốc",enteredAt:"09:40",waitMinutes:24,room:"Quầy thuốc 02",paymentType:"BHYT",paymentStatus:"Đã thanh toán",priority:"Bình thường",alerts:[],nextAction:"Chờ cấp thuốc"}
];
export const humanCases:HumanCase[]=[
 {id:"CASE-2407",patientName:"Nguyễn V. A.",type:"Cảnh báo triệu chứng",trigger:"Bệnh nhân báo khó thở khi chờ khám",priority:"P0",createdAt:"10:02",slaDue:"10:05",owner:null,status:"Mở"},
 {id:"CASE-2406",patientName:"Phạm T. H.",type:"Vấn đề BHYT",trigger:"Không xác minh được dữ liệu điện tử",priority:"P2",createdAt:"09:48",slaDue:"10:48",owner:"Lan Anh",status:"Đang xử lý"},
 {id:"CASE-2405",patientName:"Trần Q. M.",type:"Yêu cầu gọi lại",trigger:"Cần hỗ trợ đổi lịch tái khám",priority:"P2",createdAt:"09:35",slaDue:"11:35",owner:null,status:"Mở"},
 {id:"CASE-2404",patientName:"Lê M. T.",type:"FAQ ngoài phạm vi",trigger:"Không tìm thấy quy trình được phê duyệt",priority:"P3",createdAt:"09:12",slaDue:"13:12",owner:"Minh Hà",status:"Chờ bệnh nhân"}
];
export const kanbanColumns: KanbanColumn[] = [
  { id: "ARRIVED", label: "Đã đến / Chờ check-in", shortLabel: "Chờ check-in" },
  { id: "INSURANCE", label: "Xác minh bảo hiểm", shortLabel: "BHYT" },
  { id: "WAITING_DOCTOR", label: "Chờ bác sĩ", shortLabel: "Chờ bác sĩ" },
  { id: "CONSULTATION", label: "Đang khám", shortLabel: "Đang khám" },
  { id: "TESTS", label: "Cận lâm sàng", shortLabel: "Cận lâm sàng" },
  { id: "PHARMACY", label: "Nhà thuốc", shortLabel: "Lĩnh thuốc" },
];
export const dashboardMetrics: DashboardMetric[] = [
  { label: "Case đang mở", value: "24", detail: "+3 trong 1 giờ", tone: "neutral" },
  { label: "Chưa phân công", value: "7", detail: "Cần điều phối", tone: "warning" },
  { label: "P0 chưa xác nhận", value: "1", detail: "CASE-2407", tone: "danger" },
  { label: "Sắp quá SLA", value: "5", detail: "Trong 30 phút", tone: "warning" },
  { label: "Đã xử lý hôm nay", value: "38", detail: "TB 18 phút/case", tone: "success" },
];
export const visitCompanion: VisitCompanion = {
  visitId: "VISIT-001",
  patientDisplayName: "Nguyễn V. A.",
  queueNumber: "A024",
  currentStage: "Đang chờ thanh toán",
  location: "Quầy thu ngân số 03",
  floor: "Tầng 1 · Khu nhà A",
  peopleAhead: 3,
  lastUpdated: "10:24, 17/07/2026",
  instructions: ["Chuẩn bị CCCD và phiếu tiếp nhận", "Giữ số thứ tự để đối chiếu tại quầy"],
  journey,
};
export const quickActions: QuickAction[] = [
  { title: "Khám lần đầu", description: "Hướng dẫn đăng ký và tiếp nhận", icon: "heart", href: "/procedures#dang-ky" },
  { title: "Khám lại", description: "Chuẩn bị giấy hẹn và hồ sơ", icon: "refresh", href: "/procedures#dat-lich" },
  { title: "Khám BHYT", description: "Giấy tờ cần xuất trình", icon: "shield", href: "/procedures#dang-ky" },
  { title: "Chuẩn bị giấy tờ", description: "Danh sách cần mang theo", icon: "file", href: "/procedures#dang-ky" },
  { title: "Hướng dẫn cận lâm sàng", description: "Vị trí, chỉ định và kết quả", icon: "flask", href: "/procedures#kham-cls" },
  { title: "Nhận kết quả", description: "Quay lại bác sĩ kết luận", icon: "search", href: "/procedures#kham-cls" },
  { title: "Lĩnh hoặc mua thuốc", description: "Thanh toán và nhận thuốc", icon: "pill", href: "/procedures#thuoc-ket-thuc" },
  { title: "Liên hệ hỗ trợ", description: "Tạo yêu cầu cho nhân viên", icon: "phone", href: "/assistant" },
];
export const fictionalAppointment: Appointment = {
  id: "HEN-260717-042", date: "Thứ Sáu, 17/07/2026", time: "09:30",
  facility: "Cơ sở 1 · 92 Trần Hưng Đạo", department: "Phòng khám Tim mạch tổng quát",
  doctor: "BS. Nguyễn Minh An", patientDisplayName: "Nguyễn V. A.", visitType: "Tái khám theo hẹn",
  paymentType: "BHYT", status: "Đã xác nhận",
  documents: [{ label: "CCCD hoặc giấy tờ tùy thân", ready: true }, { label: "Thẻ BHYT / dữ liệu BHYT điện tử", ready: true }, { label: "Giấy hẹn tái khám", ready: false }],
};
export const fictionalMedications: Medication[] = [
  { id: "MED-01", name: "Cardioval 5 mg", dosage: "1 viên", schedule: "Mỗi ngày", instruction: "Uống sau bữa sáng", period: "01/07–30/07/2026", status: "Sắp đến giờ", time: "08:00", approvedBy: "BS. Nguyễn Minh An (giả lập)" },
  { id: "MED-02", name: "Tensiora 20 mg", dosage: "1 viên", schedule: "Mỗi ngày", instruction: "Uống sau bữa tối", period: "01/07–30/07/2026", status: "Chưa phản hồi", time: "20:00", approvedBy: "BS. Nguyễn Minh An (giả lập)" },
  { id: "MED-03", name: "Vitaheart D3", dosage: "1 viên", schedule: "Thứ Hai, Tư, Sáu", instruction: "Uống cùng bữa trưa", period: "01/07–31/08/2026", status: "Đã ghi nhận", time: "12:00", approvedBy: "BS. Nguyễn Minh An (giả lập)" },
];
export const sleep=(ms=450)=>new Promise((resolve)=>setTimeout(resolve,ms));
