import { NextResponse } from "next/server";
import { parseTransactionsFromCsv } from "@/lib/csv";
import { Orchestrator } from "@/lib/orchestrator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file in form-data under key 'file'" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const parsed = parseTransactionsFromCsv(csvText);
    if (parsed.errors.length > 0 && parsed.transactions.length === 0) {
      return NextResponse.json(
        { error: "Unable to parse CSV", details: parsed.errors },
        { status: 400 }
      );
    }

    const orchestrator = new Orchestrator();
    const result = orchestrator.run(parsed.transactions);

    return NextResponse.json({
      ...result,
      warnings: parsed.errors,
      counts: { transactions: parsed.transactions.length },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
