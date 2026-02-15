export const runtime = "nodejs";

export async function GET() {
  const raw = process.env.ANTHROPIC_API_KEY;
  const hasAnthropicKey = Boolean(raw);
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  const hasSurroundingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"));

  const looksLikeAnthropicKey =
    Boolean(trimmed) &&
    !hasSurroundingQuotes &&
    trimmed.startsWith("sk-ant-") &&
    trimmed.length >= 20 &&
    !/\s/.test(trimmed);

  return Response.json({ hasAnthropicKey, looksLikeAnthropicKey });
}
