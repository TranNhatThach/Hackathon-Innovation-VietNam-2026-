import { NextResponse } from "next/server";
import { fictionalAppointment, sleep } from "@/lib/mock-data";

export async function GET() {
  await sleep();
  return NextResponse.json({ requestId: "mock-appointment-01", timestamp: new Date().toISOString(), freshness: "Dữ liệu mô phỏng", source: "MOCK", data: fictionalAppointment });
}
