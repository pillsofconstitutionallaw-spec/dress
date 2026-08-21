import { NextResponse } from "next/server";
import { run } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

// Che capo è e con cosa si mette. Nient'altro.
export async function POST(req) {
  let image = null;
  try {
    const body = await req.json();
    image = body.image || null;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const data = await run("abbina", { image });
  return NextResponse.json(data);
}
