import { NextResponse } from "next/server";
import { run } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req) {
  let args;
  try {
    const body = await req.json();
    // Le foto non entrano nemmeno: se arrivassero per errore, verrebbero
    // comunque ignorate qui.
    args = { profile: body.profile || {}, misura: body.misura || null };
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const data = await run("analyzeColor", args);
  return NextResponse.json(data);
}
