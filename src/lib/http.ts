import { NextResponse } from "next/server";
export { requestOriginAllowed } from "@/lib/origin";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}
