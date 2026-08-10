import { NextResponse } from "next/server";
import { run } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req) {
  let args;
  try {
    const body = await req.json();
    args = { profile: body.profile || {}, closeup: body.closeup || null, fullbody: body.fullbody || null };
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const data = await run("analyzeColor", args);
  return NextResponse.json(data);
}
