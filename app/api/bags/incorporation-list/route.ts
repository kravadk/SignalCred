export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { sdk } from "@/lib/bags";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await sdk.incorporation.list();
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ projects: [], error: String(e).slice(0, 100) });
  }
}
