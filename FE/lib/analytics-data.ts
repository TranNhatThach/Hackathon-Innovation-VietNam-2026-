export type AnalyticsPeriod = "today" | "7d" | "30d";

export interface AnalyticsSnapshot {
  label: string;
  updatedAt: string;
  conversations: number;
  selfServed: number;
  groundedAnswers: number;
  handoffs: number;
  slaMet: number;
  resolvedCases: number;
  medianResponseSeconds: number;
  trackedVisits: number;
  completedVisits: number;
  medianVisitMinutes: number;
  syncedRecords: number;
  expectedRecords: number;
}

export const analyticsSnapshots: Record<AnalyticsPeriod, AnalyticsSnapshot> = {
  today: { label: "Hôm nay", updatedAt: "10:24, 17/07/2026", conversations: 300, selfServed: 216, groundedAnswers: 282, handoffs: 54, slaMet: 41, resolvedCases: 45, medianResponseSeconds: 1.4, trackedVisits: 148, completedVisits: 93, medianVisitMinutes: 76, syncedRecords: 146, expectedRecords: 148 },
  "7d": { label: "7 ngày", updatedAt: "10:24, 17/07/2026", conversations: 1840, selfServed: 1288, groundedAnswers: 1711, handoffs: 350, slaMet: 286, resolvedCases: 318, medianResponseSeconds: 1.6, trackedVisits: 962, completedVisits: 781, medianVisitMinutes: 81, syncedRecords: 948, expectedRecords: 962 },
  "30d": { label: "30 ngày", updatedAt: "10:24, 17/07/2026", conversations: 7690, selfServed: 5152, groundedAnswers: 7075, handoffs: 1615, slaMet: 1198, resolvedCases: 1346, medianResponseSeconds: 1.8, trackedVisits: 4026, completedVisits: 3510, medianVisitMinutes: 84, syncedRecords: 3954, expectedRecords: 4026 },
};

export const chatbotIntents = [
  { intent: "Giấy tờ và quyền lợi BHYT", conversations: 82, selfServiceRate: 76, handoffRate: 14, helpfulRate: 89 },
  { intent: "Quy trình khám ngoại trú", conversations: 68, selfServiceRate: 84, handoffRate: 9, helpfulRate: 93 },
  { intent: "Đặt hoặc đổi lịch khám", conversations: 55, selfServiceRate: 58, handoffRate: 31, helpfulRate: 81 },
  { intent: "Chỉ đường trong viện", conversations: 49, selfServiceRate: 78, handoffRate: 12, helpfulRate: 87 },
  { intent: "Câu hỏi ngoài phạm vi", conversations: 46, selfServiceRate: 39, handoffRate: 43, helpfulRate: 66 },
];

export const hmsStages = [
  { stage: "Tiếp nhận", visits: 31, medianWait: 6, threshold: 10 },
  { stage: "BHYT và thu phí", visits: 27, medianWait: 18, threshold: 15 },
  { stage: "Chờ bác sĩ", visits: 34, medianWait: 26, threshold: 20 },
  { stage: "Cận lâm sàng", visits: 29, medianWait: 31, threshold: 20 },
  { stage: "Lĩnh thuốc", visits: 27, medianWait: 14, threshold: 15 },
];

export const integrationSignals = [
  { name: "HMS – lượt khám", availability: 98.6, delay: "2 phút", status: "Cần theo dõi" },
  { name: "Hệ thống gọi số", availability: 99.4, delay: "45 giây", status: "Ổn định" },
  { name: "Kho quy trình QT.25.01", availability: 100, delay: "Phiên bản 07", status: "Đã đối chiếu" },
  { name: "Hàng đợi nhân viên", availability: 99.1, delay: "1 phút", status: "Ổn định" },
] as const;
