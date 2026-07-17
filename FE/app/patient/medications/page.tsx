import { PatientShell } from "@/components/patient-shell";
import { MedicationList, PatientPageHeader } from "@/components/patient-tools";
import { fictionalMedications } from "@/lib/mock-data";
export default function MedicationsPage() { return <PatientShell><PatientPageHeader eyebrow="NHẮC THUỐC" title="Lịch nhắc hôm nay" description="Ghi nhận phản hồi nhanh cho các lịch nhắc đã được cấu hình."/><MedicationList medications={fictionalMedications}/></PatientShell>; }
