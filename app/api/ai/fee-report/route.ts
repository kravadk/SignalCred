import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const removed = () => NextResponse.json({ error: "This feature was removed (off-track for Bags hackathon)" }, { status: 410 });
export async function GET()    { return removed(); }
export async function POST()   { return removed(); }
export async function PATCH()  { return removed(); }
export async function DELETE() { return removed(); }
