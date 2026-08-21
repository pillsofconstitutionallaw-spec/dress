import { NextResponse } from "next/server";
import { run } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

// L'annuncio pronto da incollare su Vinted, e il prezzo indicativo.
// Chiamata solo da chi ha premuto "Vendi": chi vuole un consiglio di
// abbinamento non paga la scrittura di un annuncio che non gli serve.
export async function POST(req) {
  let image = null;
  try {
    const body = await req.json();
    image = body.image || null;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const data = await run("vendi", { image });
  return NextResponse.json(data);
}
