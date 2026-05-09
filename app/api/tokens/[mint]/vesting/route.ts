import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const removed = () => NextResponse.json({ error: "Vesting removed (was off-chain only — fake)" }, { status: 410 });
export async function GET()  { return NextResponse.json({ schedules: [] }); }
export async function POST() { return removed(); }
