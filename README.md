# Agentic Finance Summary

Next.js app that:

- Uploads a bank transactions CSV
- Produces financial analysis + insights + action recommendations
- Provides a streaming chatbot UI powered by Anthropic Claude (context is the uploaded CSV’s computed results)

## Prerequisites

- Node.js: **20.x**
- npm: comes with Node
- (Recommended) `nvm` to manage Node versions

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

Create a file named `.env.local` in the project root:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Do not commit `.env.local`.

## Run (development)

```bash
npm run dev
```

Open:

- http://localhost:3000

## Build (production)

```bash
npm run build
npm run start
```

## Using the app

1. Open the home page.
2. Upload a CSV with the expected schema.
3. Click **Analyze**.
4. Use **Chat about this upload** to ask questions about the results (streaming response).

## CSV schema (required header row)

The CSV must include these columns (in any order):

```text
Bank Details,Account Number,Post Date,Check,Description,Debit,Credit,Status,Balance,Classification,GSPC Event,GSPC Event Details
```

Notes:

- `Debit` and `Credit` are parsed as absolute values.
- `Classification` is mapped into the internal `category` field for category-based reporting.

## API routes

- `POST /api/analyze`
  - Accepts a CSV upload and returns `{ analysis, insights, actions }`.
- `POST /api/chat`
  - Accepts `{ message, context }` and streams a text response from Claude.
  - Requires `ANTHROPIC_API_KEY`.

## Troubleshooting

- **Chat says “Missing ANTHROPIC_API_KEY”**
  - Ensure `.env.local` exists at the project root and contains `ANTHROPIC_API_KEY=...`.
  - Restart `npm run dev` after editing `.env.local`.

- **Port 3000 already in use**
  - Stop the process using port 3000, or start Next.js on a different port.

- **Node version issues**
  - Make sure you are using Node 20.x.
