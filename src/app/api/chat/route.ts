import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

type ChatRequest = {
  message: string;
  context: unknown;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response("Missing ANTHROPIC_API_KEY", { status: 500 });
    }

    const body = (await req.json()) as Partial<ChatRequest>;
    const message = typeof body.message === "string" ? body.message : "";

    if (!message.trim()) {
      return new Response("Missing message", { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt =
      "You are a helpful financial analysis assistant. You must answer ONLY using the provided JSON context (analysis/insights/actions) derived from an uploaded CSV. If the context does not contain the information needed, say you cannot determine it from the uploaded data. Be concise and use bullet points when helpful.";

    const streamResult = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      temperature: 0.2,
      system: systemPrompt,
      stream: true,
      messages: [
        {
          role: "user",
          content: `CONTEXT (JSON):\n${JSON.stringify(body.context ?? {}, null, 2)}\n\nUSER QUESTION:\n${message}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of streamResult) {
            if (event.type !== "content_block_delta") continue;
            if (event.delta.type !== "text_delta") continue;
            const delta = event.delta.text;
            if (typeof delta === "string" && delta.length > 0) controller.enqueue(encoder.encode(delta));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          controller.enqueue(encoder.encode(`\n\n[error] ${msg}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}
