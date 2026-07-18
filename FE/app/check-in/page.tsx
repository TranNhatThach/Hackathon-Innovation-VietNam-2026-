import { PatientShell } from "@/components/patient/patient-shell";
import { PatientPageHeader } from "@/components/patient/patient-tools";
import { CheckInComplete } from "@/components/patient/check-in-flow";
import { fictionalAppointment } from "@/lib/mock-data";
export default function CheckInPage() { return <PatientShell><PatientPageHeader eyebrow="XÁC NHẬN ĐẾN VIỆN" title="Xác nhận bạn đã đến" description="Kiểm tra lịch hẹn, giấy tờ và nhận số thứ tự mô phỏng."/><CheckInComplete appointment={fictionalAppointment}/></PatientShell>; }
