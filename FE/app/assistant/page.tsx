import { PatientFaq } from "@/components/patient/patient-faq";
import { PatientShell } from "@/components/patient/patient-shell";
export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const { q = "" } = await searchParams; return <PatientShell><PatientFaq initialQuestion={q}/></PatientShell>; }
