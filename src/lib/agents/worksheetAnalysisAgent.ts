import {
  AnalysisResult,
  Anomaly,
  ClassifiedTransaction,
  MonthlySeriesPoint,
  SpendItem,
} from "@/lib/types";

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dayKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeKey(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

function mean(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]) {
  if (xs.length < 2) return 0;
  const mu = mean(xs);
  const v = xs.reduce((a, b) => a + (b - mu) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export class WorksheetAnalysisAgent {
  run(transactions: ClassifiedTransaction[]): AnalysisResult {
    let income = 0;
    let expense = 0;

    let income2025 = 0;
    let expense2025 = 0;
    let txCount2025 = 0;

    const byMonth = new Map<string, { income: number; expense: number; ending?: number; lastTs?: number }>();
    const expenseByCategory = new Map<string, { total: number; count: number }>();
    const expenseByGspcEvent = new Map<string, { total: number; count: number }>();

    const inflow2025ByCategory = new Map<string, { total: number; count: number }>();
    const outflow2025ByCategory = new Map<string, { total: number; count: number }>();
    const inflow2025ByGspcEvent = new Map<string, { total: number; count: number }>();
    const outflow2025ByGspcEvent = new Map<string, { total: number; count: number }>();

    const dailyExpense = new Map<string, number>();
    const anomalies: Anomaly[] = [];

    const expenseTxs = transactions
      .filter((t) => t.direction === "expense")
      .map((t) => ({ ...t, absAmount: Math.abs(t.amount) }))
      .sort((a, b) => b.absAmount - a.absAmount);

    for (const t of transactions) {
      const is2025 = t.postDate.getUTCFullYear() === 2025;

      if (t.direction === "income") income += Math.abs(t.amount);
      if (t.direction === "expense") expense += Math.abs(t.amount);

      if (is2025) {
        txCount2025 += 1;
        if (t.direction === "income") income2025 += Math.abs(t.amount);
        if (t.direction === "expense") expense2025 += Math.abs(t.amount);

        const categoryKey = normalizeKey(t.category || t.description || "UNCATEGORIZED");
        const gspcKey = normalizeKey(t.gspcEvent || "NO EVENT");
        if (t.direction === "income") {
          const aggCat = inflow2025ByCategory.get(categoryKey) ?? { total: 0, count: 0 };
          inflow2025ByCategory.set(categoryKey, {
            total: aggCat.total + Math.abs(t.amount),
            count: aggCat.count + 1,
          });

          const aggEvt = inflow2025ByGspcEvent.get(gspcKey) ?? { total: 0, count: 0 };
          inflow2025ByGspcEvent.set(gspcKey, {
            total: aggEvt.total + Math.abs(t.amount),
            count: aggEvt.count + 1,
          });
        }
        if (t.direction === "expense") {
          const aggCat = outflow2025ByCategory.get(categoryKey) ?? { total: 0, count: 0 };
          outflow2025ByCategory.set(categoryKey, {
            total: aggCat.total + Math.abs(t.amount),
            count: aggCat.count + 1,
          });

          const aggEvt = outflow2025ByGspcEvent.get(gspcKey) ?? { total: 0, count: 0 };
          outflow2025ByGspcEvent.set(gspcKey, {
            total: aggEvt.total + Math.abs(t.amount),
            count: aggEvt.count + 1,
          });
        }
      }

      const mk = monthKey(t.postDate);
      const prev = byMonth.get(mk) ?? { income: 0, expense: 0 };

      const next = { ...prev };
      if (t.direction === "income") next.income += Math.abs(t.amount);
      if (t.direction === "expense") next.expense += Math.abs(t.amount);

      if (typeof t.balance === "number") {
        const ts = t.postDate.getTime();
        if (!next.lastTs || ts >= next.lastTs) {
          next.ending = t.balance;
          next.lastTs = ts;
        }
      }

      byMonth.set(mk, next);

      if (t.direction === "expense") {
        const key = normalizeKey(t.category || t.description || "UNCATEGORIZED");
        const agg = expenseByCategory.get(key) ?? { total: 0, count: 0 };
        expenseByCategory.set(key, {
          total: agg.total + Math.abs(t.amount),
          count: agg.count + 1,
        });

        const evtKey = normalizeKey(t.gspcEvent || "NO EVENT");
        const evtAgg = expenseByGspcEvent.get(evtKey) ?? { total: 0, count: 0 };
        expenseByGspcEvent.set(evtKey, {
          total: evtAgg.total + Math.abs(t.amount),
          count: evtAgg.count + 1,
        });

        const dk = dayKey(t.postDate);
        dailyExpense.set(dk, (dailyExpense.get(dk) ?? 0) + Math.abs(t.amount));
      }
    }

    const monthly: MonthlySeriesPoint[] = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({
        month,
        income: v.income,
        expense: v.expense,
        net: v.income - v.expense,
        endingBalance: v.ending,
      }));

    const topExpenseDescriptions: SpendItem[] = Array.from(expenseByCategory.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topExpenseByGspcEvent: SpendItem[] = Array.from(expenseByGspcEvent.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topInflows2025ByCategory: SpendItem[] = Array.from(inflow2025ByCategory.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topOutflows2025ByCategory: SpendItem[] = Array.from(outflow2025ByCategory.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topInflows2025ByGspcEvent: SpendItem[] = Array.from(inflow2025ByGspcEvent.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topOutflows2025ByGspcEvent: SpendItem[] = Array.from(outflow2025ByGspcEvent.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    for (const e of expenseTxs.slice(0, 3)) {
      anomalies.push({
        kind: "large_expense",
        title: `Large expense: ${normalizeKey(e.category || e.description || "UNCATEGORIZED")}`,
        date: e.postDate.toISOString().slice(0, 10),
        amount: e.absAmount,
        details: { category: e.category, classification: e.classification },
      });
    }

    const dailyVals = Array.from(dailyExpense.values());
    const mu = mean(dailyVals);
    const s = std(dailyVals);
    const spikeThreshold = mu + 2 * s;
    for (const [d, v] of dailyExpense.entries()) {
      if (s > 0 && v >= spikeThreshold) {
        anomalies.push({
          kind: "spend_spike",
          title: `Spend spike on ${d}`,
          date: d,
          amount: v,
          details: { mean: mu, stdev: s, threshold: spikeThreshold },
        });
      }
    }

    const net = income - expense;
    return {
      totals: { income, expense, net },
      series: { monthly },
      majorSpending: { topExpenseDescriptions, topExpenseByGspcEvent },
      year2025:
        txCount2025 > 0
          ? {
              byCategory: {
                topInflows: topInflows2025ByCategory,
                topOutflows: topOutflows2025ByCategory,
              },
              byGspcEvent: {
                topInflows: topInflows2025ByGspcEvent,
                topOutflows: topOutflows2025ByGspcEvent,
              },
              totals: {
                income: income2025,
                expense: expense2025,
                net: income2025 - expense2025,
              },
            }
          : undefined,
      anomalies,
    };
  }
}
