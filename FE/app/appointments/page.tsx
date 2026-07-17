import { PatientShell } from "@/components/patient-shell";
import { AppointmentLookup, PatientPageHeader } from "@/components/patient-tools";
import { fictionalAppointment } from "@/lib/mock-data";
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) { const { mode } = await searchParams; const booking = mode === "book"; return <PatientShell><PatientPageHeader eyebrow="DỊCH VỤ LỊCH KHÁM" title={booking ? "Đặt lịch khám" : "Tra cứu lịch khám"} description="Gửi yêu cầu đặt lịch, kiểm tra lịch hẹn và xem thông tin cần chuẩn bị trước khi đến viện."/><AppointmentLookup appointment={fictionalAppointment} defaultMode={booking ? "book" : "lookup"}/></PatientShell>; }
