"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OrchestratorResponse = {
  analysis: {
    totals: { income: number; expense: number; net: number };
    series: {
      monthly: Array<{
        month: string;
        income: number;
        expense: number;
        net: number;
        endingBalance?: number;
      }>;
    };
    majorSpending: {
      topExpenseDescriptions: Array<{ name: string; total: number; count: number }>;
      topExpenseByEvent: Array<{ name: string; total: number; count: number }>;
    };
    year2025?: {
      byCategory: {
        topInflows: Array<{ name: string; total: number; count: number }>;
        topOutflows: Array<{ name: string; total: number; count: number }>;
      };
      byEvent: {
        topInflows: Array<{ name: string; total: number; count: number }>;
        topOutflows: Array<{ name: string; total: number; count: number }>;
      };
      totals: { income: number; expense: number; net: number };
    };
    anomalies: Array<{
      kind: string;
      title: string;
      date?: string;
      amount?: number;
      details?: Record<string, unknown>;
    }>;
  };
  insights: Array<{
    id: string;
    title: string;
    summary: string;
    severity: "low" | "medium" | "high";
    evidence: Record<string, unknown>;
  }>;
  actions: Array<{
    id: string;
    recommendation: string;
    priority: "low" | "medium" | "high";
    expectedImpact: string;
    steps: string[];
    successMetric: string;
  }>;
  warnings?: string[];
  counts?: { transactions: number };
  error?: string;
  details?: string[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function compactMoney(n: number) {
  return n.toLocaleString(undefined, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });
}

function pillColor(level: string) {
  if (level === "high") return "bg-red-100 text-red-800";
  if (level === "medium") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function BreakdownCard({
  title,
  inflows,
  outflows,
}: {
  title: string;
  inflows: Array<{ name: string; total: number; count: number }>;
  outflows: Array<{ name: string; total: number; count: number }>;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="font-medium">{title}</div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-800">Inflows</div>
            <div className="text-xs text-zinc-500">Top 10</div>
          </div>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inflows} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(v) => compactMoney(Number(v))} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Count</th>
                </tr>
              </thead>
              <tbody>
                {inflows.map((x) => (
                  <tr key={x.name} className="border-t border-zinc-100">
                    <td className="py-2 pr-4">{x.name}</td>
                    <td className="py-2 pr-4">{money(x.total)}</td>
                    <td className="py-2 pr-4">{x.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-800">Outflows</div>
            <div className="text-xs text-zinc-500">Top 10</div>
          </div>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outflows} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(v) => compactMoney(Number(v))} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="total" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Count</th>
                </tr>
              </thead>
              <tbody>
                {outflows.map((x) => (
                  <tr key={x.name} className="border-t border-zinc-100">
                    <td className="py-2 pr-4">{x.name}</td>
                    <td className="py-2 pr-4">{money(x.total)}</td>
                    <td className="py-2 pr-4">{x.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);
    setChatInput("");
    setChatError(null);

    try {
      const fd = new FormData();
      fd.set("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: fd,
      });

      const json = (await res.json()) as OrchestratorResponse;
      if (!res.ok) {
        setError(json.error ?? "Request failed");
        setResult(json);
        return;
      }

      setResult(json);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function sendChat() {
    if (!result || result.error) return;
    const message = chatInput.trim();
    if (!message) return;

    setChatError(null);
    setChatLoading(true);
    setChatInput("");

    setChatMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            analysis: result.analysis,
            insights: result.insights,
            actions: result.actions,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Chat request failed (${res.status})`);
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        setChatMessages((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const lastIdx = next.length - 1;
          const last = next[lastIdx];
          if (last.role !== "assistant") return prev;
          next[lastIdx] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setChatError(msg);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agentic Finance Summary</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Upload a transactions CSV to generate analysis, insights, and actions.
            </p>
          </div>
          <div className="hidden sm:block">
            <Image src="/next.svg" alt="" width={90} height={18} />
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-800">CSV file</label>
              <input
                className="mt-2 block w-full cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setResult(null);
                  setError(null);
                  setFile(e.target.files?.[0] ?? null);
                }}
              />
              <p className="mt-2 text-xs text-zinc-500">
                Expected columns: Bank Details, Account Number, Post Date, Check, Description, Debit, Credit, Status, Balance, Classification, Event, Event Details
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50"
              disabled={!file || loading}
              onClick={analyze}
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
              {result?.details && result.details.length > 0 ? (
                <ul className="mt-2 list-disc pl-5">
                  {result.details.slice(0, 8).map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        {result && !result.error ? (
          <div className="mt-8 grid grid-cols-1 gap-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-sm text-zinc-600">Income</div>
                <div className="mt-2 text-2xl font-semibold">{money(result.analysis.totals.income)}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-sm text-zinc-600">Expense</div>
                <div className="mt-2 text-2xl font-semibold">{money(result.analysis.totals.expense)}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-sm text-zinc-600">Net</div>
                <div className="mt-2 text-2xl font-semibold">{money(result.analysis.totals.net)}</div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-semibold">Chat about this upload</h2>
                <div className="text-xs text-zinc-500">
                  Requires `ANTHROPIC_API_KEY` in your environment.
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="max-h-[320px] space-y-3 overflow-auto">
                  {chatMessages.length === 0 ? (
                    <div className="text-sm text-zinc-600">
                      Ask questions like:
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
                          disabled={chatLoading}
                          onClick={() => setChatInput("What were my top outflows by category in 2025?")}
                        >
                          What were my top outflows by category in 2025?
                        </button>
                        <button
                          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
                          disabled={chatLoading}
                          onClick={() => setChatInput("Summarize the key insights and recommended actions.")}
                        >
                          Summarize the key insights and recommended actions.
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={
                        m.role === "user"
                          ? "ml-auto w-full rounded-lg bg-white p-3 sm:w-5/6"
                          : "mr-auto w-full rounded-lg bg-zinc-900 p-3 text-white sm:w-5/6"
                      }
                    >
                      <div className="text-xs opacity-70">{m.role === "user" ? "You" : "Assistant"}</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{m.content || (m.role === "assistant" ? "…" : "")}</div>
                    </div>
                  ))}
                </div>

                {chatError ? <div className="mt-3 text-sm text-red-700">{chatError}</div> : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this statement…"
                    disabled={chatLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChat();
                    }}
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50"
                    disabled={chatLoading || chatInput.trim().length === 0}
                    onClick={sendChat}
                  >
                    {chatLoading ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-semibold">Income / Expense / Net (Monthly)</h2>
                <div className="text-xs text-zinc-500">
                  {result.counts?.transactions ? `${result.counts.transactions} transactions` : null}
                </div>
              </div>
              <div className="mt-4 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.analysis.series.monthly} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => compactMoney(Number(v))} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => money(Number(value))}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {result.analysis.year2025 ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="text-lg font-semibold">Major inflows & outflows (Year 2025)</h2>
                <div className="mt-1 text-sm text-zinc-600">
                  Totals for 2025: Income {money(result.analysis.year2025.totals.income)}, Expense{" "}
                  {money(result.analysis.year2025.totals.expense)}, Net {money(result.analysis.year2025.totals.net)}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6">
                  <BreakdownCard
                    title="Breakdown by Category"
                    inflows={result.analysis.year2025.byCategory.topInflows}
                    outflows={result.analysis.year2025.byCategory.topOutflows}
                  />
                  <BreakdownCard
                    title="Breakdown by Event"
                    inflows={result.analysis.year2025.byEvent.topInflows}
                    outflows={result.analysis.year2025.byEvent.topOutflows}
                  />
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="text-lg font-semibold">Major inflows & outflows (Year 2025)</h2>
                <div className="mt-1 text-sm text-zinc-600">
                  No 2025 transactions were found in the uploaded file.
                </div>
              </section>
            )}

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Insights</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {result.insights.map((i) => (
                  <div key={i.id} className="rounded-lg border border-zinc-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{i.title}</div>
                        <div className="mt-1 text-sm text-zinc-600">{i.summary}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${pillColor(
                          i.severity
                        )}`}
                      >
                        {i.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Recommended actions</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {result.actions.map((a) => (
                  <div key={a.id} className="rounded-lg border border-zinc-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{a.recommendation}</div>
                        <div className="mt-1 text-sm text-zinc-600">{a.expectedImpact}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${pillColor(
                          a.priority
                        )}`}
                      >
                        {a.priority}
                      </span>
                    </div>
                    <ul className="mt-3 list-disc pl-5 text-sm text-zinc-700">
                      {a.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs text-zinc-500">
                      Success metric: {a.successMetric}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Major spending</h2>
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">By Category</div>
                    <div className="text-xs text-zinc-500">Top 10</div>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="py-2 pr-4">Category</th>
                          <th className="py-2 pr-4">Total</th>
                          <th className="py-2 pr-4">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.analysis.majorSpending.topExpenseDescriptions.map((x) => (
                          <tr key={x.name} className="border-t border-zinc-100">
                            <td className="py-2 pr-4">{x.name}</td>
                            <td className="py-2 pr-4">{money(x.total)}</td>
                            <td className="py-2 pr-4">{x.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">By Event</div>
                    <div className="text-xs text-zinc-500">Top 10</div>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="py-2 pr-4">Event</th>
                          <th className="py-2 pr-4">Total</th>
                          <th className="py-2 pr-4">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.analysis.majorSpending.topExpenseByEvent.map((x) => (
                          <tr key={x.name} className="border-t border-zinc-100">
                            <td className="py-2 pr-4">{x.name}</td>
                            <td className="py-2 pr-4">{money(x.total)}</td>
                            <td className="py-2 pr-4">{x.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {result.warnings && result.warnings.length > 0 ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <div className="text-sm font-medium text-amber-900">Warnings</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                  {result.warnings.slice(0, 10).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
