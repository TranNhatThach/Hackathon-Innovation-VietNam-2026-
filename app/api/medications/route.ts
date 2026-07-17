import { NextResponse } from "next/server";
import { fictionalMedications, sleep } from "@/lib/mock-data";

export async function GET() {
  await sleep();
  return NextResponse.json({ requestId: "mock-medications-01", timestamp: new Date().toISOString(), freshness: "Dữ liệu mô phỏng", source: "MOCK", data: fictionalMedications });
}
