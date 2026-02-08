import { AnalysisResult, Insight } from "@/lib/types";

function pctChange(prev: number, next: number) {
  if (prev === 0) return next === 0 ? 0 : 1;
  return (next - prev) / Math.abs(prev);
}

export class InsightAgent {
  run(analysis: AnalysisResult): Insight[] {
    const insights: Insight[] = [];

    const { totals } = analysis;
    const monthly = analysis.series.monthly;

    if (totals.net < 0) {
      insights.push({
        id: "net_negative",
        title: "Net cashflow is negative",
        summary:
          "Total expenses exceed total income over the selected period. This can indicate cash burn or a timing mismatch between inflows and outflows.",
        severity: "high",
        evidence: { income: totals.income, expense: totals.expense, net: totals.net },
      });
    } else {
      insights.push({
        id: "net_positive",
        title: "Net cashflow is positive",
        summary:
          "Total income exceeds total expenses over the selected period. This is generally healthy—watch for volatility and concentration risks.",
        severity: "low",
        evidence: { income: totals.income, expense: totals.expense, net: totals.net },
      });
    }

    if (monthly.length >= 2) {
      const last = monthly[monthly.length - 1];
      const prev = monthly[monthly.length - 2];

      const expChg = pctChange(prev.expense, last.expense);
      if (expChg >= 0.2) {
        insights.push({
          id: "expense_up_mom",
          title: "Expenses increased month-over-month",
          summary:
            "Expenses increased significantly compared to the prior month. Review the drivers to ensure the increase is expected.",
          severity: "medium",
          evidence: {
            previousMonth: prev.month,
            previousExpense: prev.expense,
            currentMonth: last.month,
            currentExpense: last.expense,
            changePct: expChg,
          },
        });
      }

      const incChg = pctChange(prev.income, last.income);
      if (incChg <= -0.2) {
        insights.push({
          id: "income_down_mom",
          title: "Income decreased month-over-month",
          summary:
            "Income dropped significantly compared to the prior month. If this is not seasonal, verify collections, invoicing, or revenue pipeline.",
          severity: "medium",
          evidence: {
            previousMonth: prev.month,
            previousIncome: prev.income,
            currentMonth: last.month,
            currentIncome: last.income,
            changePct: incChg,
          },
        });
      }

      if (
        typeof prev.endingBalance === "number" &&
        typeof last.endingBalance === "number" &&
        last.endingBalance < prev.endingBalance
      ) {
        insights.push({
          id: "balance_decline",
          title: "Ending balance declined",
          summary:
            "The account ending balance decreased compared to the prior month. Monitor runway and upcoming obligations.",
          severity: "medium",
          evidence: {
            previousMonth: prev.month,
            previousEndingBalance: prev.endingBalance,
            currentMonth: last.month,
            currentEndingBalance: last.endingBalance,
          },
        });
      }
    }

    if (analysis.majorSpending.topExpenseDescriptions.length > 0) {
      const top = analysis.majorSpending.topExpenseDescriptions[0];
      insights.push({
        id: "top_spend",
        title: "Major spending concentration",
        summary:
          "One spending description accounts for a notable share of total expenses. Confirm it is expected and properly categorized.",
        severity: "low",
        evidence: {
          topExpenseDescription: top.name,
          topExpenseTotal: top.total,
          topExpenseCount: top.count,
          totalExpense: analysis.totals.expense,
        },
      });
    }

    if (analysis.anomalies.some((a) => a.kind === "spend_spike")) {
      insights.push({
        id: "spend_spikes",
        title: "Spend spikes detected",
        summary:
          "One or more days had unusually high spending compared to the typical daily level. Validate if these are one-offs or recurring.",
        severity: "medium",
        evidence: {
          spikes: analysis.anomalies.filter((a) => a.kind === "spend_spike").slice(0, 5),
        },
      });
    }

    return insights;
  }
}
