import { NextResponse } from "next/server";
import { sleep, visits } from "@/lib/mock-data";
export async function GET(){await sleep();return NextResponse.json({requestId:"mock-visits-01",timestamp:new Date().toISOString(),freshness:"Dữ liệu mô phỏng",source:"MOCK",data:visits});}
