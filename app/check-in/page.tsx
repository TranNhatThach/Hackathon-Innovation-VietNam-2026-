import { PatientShell } from "@/components/patient-shell";
import { PatientPageHeader } from "@/components/patient-tools";
import { CheckInComplete } from "@/components/check-in-complete";
import { fictionalAppointment } from "@/lib/mock-data";
export default function CheckInPage() { return <PatientShell><PatientPageHeader eyebrow="XÁC NHẬN ĐẾN VIỆN" title="Xác nhận bạn đã đến" description="Kiểm tra lịch hẹn, giấy tờ và nhận số thứ tự mô phỏng."/><CheckInComplete appointment={fictionalAppointment}/></PatientShell>; }
