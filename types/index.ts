export type LoadState = "ready" | "loading" | "empty" | "error";
export type VisitStage = "ARRIVED" | "REGISTRATION" | "INSURANCE" | "PAYMENT" | "VITALS" | "WAITING_DOCTOR" | "CONSULTATION" | "TESTS" | "RESULTS" | "PHARMACY" | "COMPLETED";
export type Priority = "P0" | "P1" | "P2" | "P3";
export interface JourneyStep { id: VisitStage; label: string; status: "done" | "current" | "upcoming"; }
export interface Visit {
  id: string;
  patientName: string;
  queueNumber: string;
  stage: VisitStage;
  stageLabel: string;
  enteredAt: string;
  waitMinutes: number;
  room?: string;
  doctor?: string;
  paymentType: "BHYT" | "Dịch vụ";
  paymentStatus: "Đã thanh toán" | "Chờ thanh toán";
  priority: "Bình thường" | "Ưu tiên";
  alerts: string[];
  nextAction: string;
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
  status: "Mở" | "Đã phân công" | "Đang xử lý" | "Chờ bệnh nhân" | "Đã chuyển cấp" | "Đã giải quyết";
}
export interface KanbanColumn {
  id: VisitStage;
  label: string;
  shortLabel: string;
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
  id: string; date: string; time: string; facility: string; department: string;
  doctor: string; patientDisplayName: string; visitType: string;
  paymentType: "BHYT" | "Dịch vụ"; status: "Đã xác nhận" | "Chờ xác nhận" | "Đã hoàn thành";
  documents: { label: string; ready: boolean }[];
}
export interface Medication {
  id: string; name: string; dosage: string; schedule: string; instruction: string;
  period: string; status: "Sắp đến giờ" | "Đã ghi nhận" | "Chưa phản hồi";
  time: string; approvedBy: string;
}
export interface ApiEnvelope<T> { requestId: string; timestamp: string; freshness: string; source: "MOCK"; data: T; }
export type IconName = "heart" | "calendar" | "search" | "route" | "message" | "file" | "shield" | "flask" | "pill" | "phone" | "home" | "users" | "kanban" | "bot" | "book" | "chart" | "bell" | "settings" | "clock" | "map" | "help" | "arrow" | "check" | "alert" | "menu" | "close" | "filter" | "refresh" | "chevron" | "user" | "more" | "inbox";
