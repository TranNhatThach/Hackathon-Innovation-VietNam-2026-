import { HumanLoopDashboard } from "@/components/human-loop-dashboard";
import { humanCases } from "@/lib/mock-data";

export default function HumanInLoopPage() { return <HumanLoopDashboard cases={humanCases}/>; }
