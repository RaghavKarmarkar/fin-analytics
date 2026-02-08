import { ActionItem, AnalysisResult, Insight } from "@/lib/types";

export class ActionAgent {
  run(analysis: AnalysisResult, insights: Insight[]): ActionItem[] {
    const actions: ActionItem[] = [];

    const has = (id: string) => insights.some((i) => i.id === id);

    if (has("net_negative")) {
      actions.push({
        id: "reduce_burn",
        recommendation: "Reduce cash burn by reviewing top expense drivers",
        priority: "high",
        expectedImpact: "Lower monthly expenses and improve net cashflow.",
        steps: [
          "Review the top 10 expense descriptions by total spend.",
          "Identify non-essential or deferrable expenses.",
          "Set weekly spending limits and alerts for large transactions.",
        ],
        successMetric: "Month-over-month expense reduction and net cashflow >= 0.",
      });
    }

    if (has("income_down_mom")) {
      actions.push({
        id: "stabilize_income",
        recommendation: "Investigate income drop and stabilize collections",
        priority: "high",
        expectedImpact: "Increase inflows and reduce revenue volatility.",
        steps: [
          "Check whether large expected deposits are missing or delayed.",
          "Review recent invoices/receivables and follow up on overdue items.",
          "Validate that payment processors and bank feeds are operating correctly.",
        ],
        successMetric: "Income returns to typical monthly baseline within 1-2 cycles.",
      });
    }

    if (has("expense_up_mom")) {
      actions.push({
        id: "expense_driver_review",
        recommendation: "Pinpoint month-over-month expense increase drivers",
        priority: "medium",
        expectedImpact: "Prevent sustained cost increases from becoming permanent.",
        steps: [
          "Compare last month vs previous month top expense descriptions.",
          "Confirm if increases are planned (e.g., payroll, rent, annual renewals).",
          "Renegotiate or seek alternatives for recurring vendor costs where possible.",
        ],
        successMetric: "Expense growth rate returns to normal range (<10% MoM unless planned).",
      });
    }

    if (has("spend_spikes")) {
      actions.push({
        id: "spike_investigation",
        recommendation: "Investigate days with unusually high spending",
        priority: "medium",
        expectedImpact: "Detect fraud, one-time events, or miscategorized transactions.",
        steps: [
          "Review the spike dates and the transactions on those days.",
          "Confirm vendor legitimacy and whether spend is expected.",
          "If recurring, budget explicitly and monitor going forward.",
        ],
        successMetric: "No unrecognized spikes; recurring spikes are planned/budgeted.",
      });
    }

    if (analysis.majorSpending.topExpenseDescriptions.length > 0) {
      const top = analysis.majorSpending.topExpenseDescriptions[0];
      actions.push({
        id: "top_vendor_check",
        recommendation: `Validate and optimize major spend: ${top.name}`,
        priority: "low",
        expectedImpact: "Improve cost efficiency for the largest spending area.",
        steps: [
          "Confirm this spend category is correctly labeled and expected.",
          "Check for duplicates, avoidable fees, or opportunities to consolidate vendors.",
          "Set an alert threshold for single transactions exceeding a chosen limit.",
        ],
        successMetric: "Reduced unit cost or fewer large unplanned transactions.",
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: "baseline_monitoring",
        recommendation: "Set a baseline and monitor key metrics monthly",
        priority: "low",
        expectedImpact: "Early detection of changes in income, expenses, and balance.",
        steps: [
          "Track monthly income, expense, and ending balance.",
          "Review top spending descriptions monthly.",
          "Flag anomalies for review.",
        ],
        successMetric: "Monthly review process established and maintained.",
      });
    }

    return actions;
  }
}
