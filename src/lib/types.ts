export type Transaction = {
  bankDetails?: string;
  accountNumber: string;
  postDate: Date;
  check?: string;
  description: string;
  status?: string;
  classification?: string;
  category?: string;
  event?: string;
  eventDetails?: string;
  debit?: number;
  credit?: number;
  amount: number;
  balance?: number;
};

export type MoneyDirection = "income" | "expense" | "unknown";

export type ClassifiedTransaction = Transaction & {
  direction: MoneyDirection;
};

export type MonthlySeriesPoint = {
  month: string;
  income: number;
  expense: number;
  net: number;
  endingBalance?: number;
};

export type SpendItem = {
  name: string;
  total: number;
  count: number;
};

 export type EventDetailsSpendItem = {
  event: string;
  eventDetails: string;
  total: number;
  count: number;
 };

export type Anomaly = {
  kind: "large_expense" | "spend_spike" | "balance_drop";
  title: string;
  date?: string;
  amount?: number;
  details?: Record<string, unknown>;
};

export type AnalysisResult = {
  totals: {
    income: number;
    expense: number;
    net: number;
  };
  series: {
    monthly: MonthlySeriesPoint[];
  };
  majorSpending: {
    topExpenseDescriptions: SpendItem[];
    topExpenseByEvent: SpendItem[];
  };
  year2025?: {
    byCategory: {
      topInflows: SpendItem[];
      topOutflows: SpendItem[];
    };
    byEvent: {
      topInflows: SpendItem[];
      topOutflows: SpendItem[];
    };
    byEventDetails: {
      topInflows: EventDetailsSpendItem[];
      topOutflows: EventDetailsSpendItem[];
    };
    totals: {
      income: number;
      expense: number;
      net: number;
    };
  };
  anomalies: Anomaly[];
};

export type Insight = {
  id: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  evidence: Record<string, unknown>;
};

export type ActionItem = {
  id: string;
  recommendation: string;
  priority: "low" | "medium" | "high";
  expectedImpact: string;
  steps: string[];
  successMetric: string;
};

export type OrchestratorResult = {
  analysis: AnalysisResult;
  insights: Insight[];
  actions: ActionItem[];
};
