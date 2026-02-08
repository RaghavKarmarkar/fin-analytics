import { ClassifiedTransaction, OrchestratorResult } from "@/lib/types";
import { WorksheetAnalysisAgent } from "@/lib/agents/worksheetAnalysisAgent";
import { InsightAgent } from "@/lib/agents/insightAgent";
import { ActionAgent } from "@/lib/agents/actionAgent";

export class Orchestrator {
  private worksheet = new WorksheetAnalysisAgent();
  private insight = new InsightAgent();
  private action = new ActionAgent();

  run(transactions: ClassifiedTransaction[]): OrchestratorResult {
    const analysis = this.worksheet.run(transactions);
    const insights = this.insight.run(analysis);
    const actions = this.action.run(analysis, insights);
    return { analysis, insights, actions };
  }
}
