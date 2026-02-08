import { ClassifiedTransaction, MoneyDirection, Transaction } from "@/lib/types";

const REQUIRED_HEADERS = [
  "Bank Details",
  "Account Number",
  "Post Date",
  "Check",
  "Description",
  "Debit",
  "Credit",
  "Status",
  "Balance",
  "Classification",
  "GSPC Event",
  "GSPC Event Details",
] as const;

function normalizeHeader(h: string) {
  return h.trim();
}

function parseMoney(raw: string): number {
  const s = raw.trim();
  if (!s) return 0;

  const negByParens = /^\(.*\)$/.test(s);
  const cleaned = s
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");

  const n = Number(cleaned);
  const v = Number.isFinite(n) ? n : 0;
  return negByParens ? -Math.abs(v) : v;
}

function parseDate(raw: string): Date {
  const s = raw.trim();
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    let yy = Number(m[3]);
    if (yy < 100) yy += 2000;
    const d2 = new Date(Date.UTC(yy, mm - 1, dd));
    if (!Number.isNaN(d2.getTime())) return d2;
  }

  return new Date(0);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function validateHeaders(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter((h) => !normalized.includes(h));
  return { ok: missing.length === 0, missing };
}

function classifyDirection(debit: number, credit: number, amount: number): MoneyDirection {
  if (credit > 0 && debit === 0) return "income";
  if (debit > 0 && credit === 0) return "expense";
  if (amount > 0) return "income";
  if (amount < 0) return "expense";
  return "unknown";
}

export function parseTransactionsFromCsv(csvText: string): {
  transactions: ClassifiedTransaction[];
  errors: string[];
} {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { transactions: [], errors: ["CSV is empty"] };

  const header = splitCsvLine(lines[0]);
  const headerCheck = validateHeaders(header);
  if (!headerCheck.ok) {
    return {
      transactions: [],
      errors: [`Missing required columns: ${headerCheck.missing.join(", ")}`],
    };
  }

  const idx = new Map<string, number>();
  header.forEach((h, i) => idx.set(normalizeHeader(h), i));

  const errors: string[] = [];
  const transactions: ClassifiedTransaction[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);

    const get = (name: (typeof REQUIRED_HEADERS)[number]) =>
      cols[idx.get(name) ?? -1] ?? "";

    const bankDetails = get("Bank Details");
    const accountNumber = get("Account Number");
    const postDate = parseDate(get("Post Date"));
    const check = get("Check");
    const description = get("Description");
    const debit = Math.abs(parseMoney(get("Debit")));
    const credit = Math.abs(parseMoney(get("Credit")));
    const status = get("Status");
    const balanceRaw = get("Balance");
    const balance = balanceRaw ? parseMoney(balanceRaw) : undefined;
    const classification = get("Classification");
    const gspcEvent = get("GSPC Event");
    const gspcEventDetails = get("GSPC Event Details");

    const category = classification;

    const amount = credit - debit;

    if (
      !accountNumber &&
      !description &&
      debit === 0 &&
      credit === 0 &&
      balance === undefined &&
      postDate.getTime() === 0
    ) {
      continue;
    }

    if (postDate.getTime() === 0) {
      errors.push(`Row ${i + 1}: invalid Post Date`);
      continue;
    }

    const tx: Transaction = {
      bankDetails: bankDetails || undefined,
      accountNumber,
      postDate,
      check: check || undefined,
      description,
      amount,
      balance,
      status: status || undefined,
      classification: classification || undefined,
      category: category || undefined,
      gspcEvent: gspcEvent || undefined,
      gspcEventDetails: gspcEventDetails || undefined,
      debit: debit || undefined,
      credit: credit || undefined,
    };

    const direction = classifyDirection(debit, credit, amount);
    transactions.push({ ...tx, direction });
  }

  transactions.sort((a, b) => a.postDate.getTime() - b.postDate.getTime());

  return { transactions, errors };
}
