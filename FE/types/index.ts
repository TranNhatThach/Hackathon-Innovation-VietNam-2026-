export type LoadState = "ready" | "loading" | "empty" | "error";
export type VisitStage = "SCHEDULED" | "ARRIVED" | "REGISTRATION" | "PAYMENT" | "VITALS" | "WAITING_DOCTOR" | "CONSULTATION" | "TESTS" | "RESULTS" | "PHARMACY" | "COMPLETED";
export type Priority = "P0" | "P1" | "P2" | "P3";
export interface JourneyStep { id: VisitStage | string; label: string; status: "done" | "current" | "upcoming"; }
export interface Visit {
  id: string;
  patientName: string;
  queueNumber: string;
  stage: VisitStage | string;
  stageLabel?: string;
  checkInTime?: string;
  waitMinutes: number;
  alerts: string[];
  paymentType: "BHYT" | "Tiền mặt" | "Thẻ tín dụng" | "Dịch vụ";
  paymentStatus: "Đã thanh toán" | "Chờ thanh toán";
  priority?: "Bình thường" | "Ưu tiên";
  room?: string;
  doctor?: string;
  nextAction?: string;
  enteredAt?: string;
}
export interface HumanCase {
  id: string;
  patientName: string;
  type: string;
  trigger: string;
  priority: Priority;
  createdAt: string;
  slaDue: string;
  owner: string | null;
  status: "Mở" | "Đã phân công" | "Đang xử lý" | "Đã chuyển cấp" | "Đã giải quyết";
  responsibleRole?: string;
  staffActions?: string[];
  note?: string;
}
export interface KanbanColumn {
  id: string;
  title?: string;
  description?: string;
  shortLabel?: string;
  label?: string;
}
export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "danger" | "warning" | "success";
}
export interface VisitCompanion {
  visitId: string;
  patientDisplayName: string;
  queueNumber: string;
  currentStage: string;
  location: string;
  floor: string;
  peopleAhead: number;
  lastUpdated: string;
  instructions: string[];
  journey: JourneyStep[];
}
export interface QuickAction { title: string; description: string; icon: IconName; href: string; }
export interface Appointment {
  id: string;
  patientName?: string;
  patientId?: string;
  dateTime?: Date;
  date: string;
  time: string;
  doctor: string;
  specialty?: string;
  department: string;
  facility: string;
  location?: string;
  status: "confirmed" | "pending" | "cancelled" | "Đã xác nhận";
  queueNumber?: string;
  paymentType: "BHYT" | "Dịch vụ";
  visitType: string;
  documents: { label: string; ready: boolean }[];
  notes?: string;
  patientDisplayName?: string;
}
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency?: string;
  instructions?: string;
  daysRemaining?: number;
  nextTime?: string;
  taken?: boolean;
  time?: string;
  status?: "Sắp đến giờ" | "Đã ghi nhận" | "Chưa phản hồi";
  schedule?: string;
  instruction?: string;
  period?: string;
  approvedBy?: string;
}
export interface ApiEnvelope<T> { requestId: string; timestamp: string; freshness: string; source: "MOCK"; data: T; }
export type IconName = "heart" | "calendar" | "search" | "route" | "message" | "file" | "shield" | "flask" | "pill" | "phone" | "home" | "users" | "kanban" | "bot" | "book" | "chart" | "bell" | "settings" | "clock" | "map" | "help" | "arrow" | "check" | "alert" | "menu" | "close" | "filter" | "refresh" | "chevron" | "user" | "more" | "inbox" | "mic" | "mic-off" | "volume" | "volume-off";
