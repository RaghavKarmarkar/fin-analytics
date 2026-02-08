# Agent Orchestration Sequence Diagram

This document describes how the agents in the `agenticai` project are orchestrated.

## Sequence diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Next.js UI (page.tsx)
    participant API as API Route (POST /api/analyze)
    participant CSV as CSV Parser (parseTransactionsFromCsv)
    participant ORCH as Orchestrator (lib/orchestrator.ts)
    participant WA as WorksheetAnalysisAgent
    participant IA as InsightAgent
    participant AA as ActionAgent

    User->>UI: Upload CSV + click Analyze
    UI->>API: POST multipart/form-data (file)

    API->>CSV: parseTransactionsFromCsv(csvText)
    CSV-->>API: { transactions, errors/warnings }

    alt parse failed (no transactions)
        API-->>UI: 400 { error, details }
    else parse ok
        API->>ORCH: run(transactions)

        ORCH->>WA: run(transactions)
        WA-->>ORCH: analysis (totals, monthly series, anomalies, 2025 breakdowns)

        ORCH->>IA: run(analysis)
        IA-->>ORCH: insights[]

        ORCH->>AA: run(analysis, insights)
        AA-->>ORCH: actions[]

        ORCH-->>API: { analysis, insights, actions }
        API-->>UI: 200 + { analysis, insights, actions, warnings, counts }
        UI-->>User: Render charts + tables + recommendations
    end
```

## Where this maps in code

- Orchestration:
  - `src/lib/orchestrator.ts`

- Agents:
  - `src/lib/agents/worksheetAnalysisAgent.ts`
  - `src/lib/agents/insightAgent.ts`
  - `src/lib/agents/actionAgent.ts`

- Entry point:
  - `src/app/api/analyze/route.ts` (API)
  - `src/app/page.tsx` (UI)
