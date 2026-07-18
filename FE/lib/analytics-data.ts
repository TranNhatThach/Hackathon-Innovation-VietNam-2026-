export type AnalyticsPeriod = "today" | "7d" | "30d";

interface AnalyticsSnapshot {
  trackedVisits: number; completedVisits: number; conversations: number; selfServed: number;
  groundedAnswers: number; handoffs: number; slaMet: number; resolvedCases: number;
  medianResponseSeconds: number; syncedRecords: number; expectedRecords: number; updatedAt: string;
}

export const analyticsSnapshots: Record<AnalyticsPeriod, AnalyticsSnapshot> = {
  today: { trackedVisits: 128, completedVisits: 91, conversations: 100, selfServed: 72, groundedAnswers: 89, handoffs: 28, slaMet: 22, resolvedCases: 25, medianResponseSeconds: 2.4, syncedRecords: 124, expectedRecords: 128, updatedAt: "10:24" },
  "7d": { trackedVisits: 1840, completedVisits: 1511, conversations: 552, selfServed: 397, groundedAnswers: 503, handoffs: 155, slaMet: 139, resolvedCases: 155, medianResponseSeconds: 2.7, syncedRecords: 1812, expectedRecords: 1840, updatedAt: "10:24" },
  "30d": { trackedVisits: 3542, completedVisits: 3018, conversations: 2310, selfServed: 1686, groundedAnswers: 2114, handoffs: 624, slaMet: 558, resolvedCases: 624, medianResponseSeconds: 2.9, syncedRecords: 3479, expectedRecords: 3542, updatedAt: "10:24" },
};

export const hmsStages = [
  { stage: "Đăng ký", visits: 128, medianWait: 8, threshold: 15 },
  { stage: "BHYT / thu phí", visits: 113, medianWait: 14, threshold: 20 },
  { stage: "Chờ bác sĩ", visits: 101, medianWait: 27, threshold: 25 },
  { stage: "Cận lâm sàng", visits: 76, medianWait: 31, threshold: 20 },
];

export const chatbotIntents = [
  { intent: "Đặt và đổi lịch", conversations: 29, selfServiceRate: 69, handoffRate: 31, helpfulRate: 82 },
  { intent: "Chuẩn bị giấy tờ", conversations: 22, selfServiceRate: 86, handoffRate: 14, helpfulRate: 91 },
  { intent: "Theo dõi lượt khám", conversations: 19, selfServiceRate: 79, handoffRate: 21, helpfulRate: 88 },
  { intent: "Ngoài phạm vi", conversations: 14, selfServiceRate: 36, handoffRate: 64, helpfulRate: 66 },
];

export const integrationSignals = [
  { name: "HMS lượt khám", availability: 99.8, delay: "2 phút", status: "Ổn định" },
  { name: "Hàng đợi hỗ trợ", availability: 99.2, delay: "1 phút", status: "Ổn định" },
  { name: "Nhật ký chatbot", availability: 98.7, delay: "5 phút", status: "Theo dõi" },
];
