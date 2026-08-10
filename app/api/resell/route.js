import { NextResponse } from "next/server";
import { run } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req) {
  let image = null;
  try {
    const body = await req.json();
    image = body.image || null;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const data = await run("resell", { image });
  return NextResponse.json(data);
}
