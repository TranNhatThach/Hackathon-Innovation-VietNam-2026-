import { PatientShell } from "@/components/patient-shell";
import { VisitCompanionView } from "@/components/visit-companion";
import { visitCompanion } from "@/lib/mock-data";

export default async function VisitPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  return <PatientShell><VisitCompanionView visit={{ ...visitCompanion, visitId }}/></PatientShell>;
}
