# Synapse

A concept-knowledge-graph learning app. Extract concepts and relations from your sources, explore them as a connected graph, and generate grounded references for deeper learning.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Drizzle ORM** + postgres.js driver
- **NextAuth v5** (Credentials provider, JWT sessions)
- **Cytoscape.js** for graph visualization
- **Tailwind CSS** with Tenexity design tokens
- **OpenRouter** (OpenAI-compatible) for LLM calls

## Getting started

```bash
# Install dependencies
npm install

# Set required environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and OPENROUTER_API_KEY

# Generate DB migrations
npm run db:generate

# Run migrations and seed demo user
npm run db:migrate

# Start dev server
npm run dev
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for LLM calls (app falls back to deterministic stubs if absent) |
| `NEXTAUTH_SECRET` | No | Auto-generated if absent |
| `NEXTAUTH_URL` | No | Base URL (defaults to `http://localhost:3000`) |

## Demo account

- Email: `demo@synapse.app`
- Password: any (any password is accepted for the demo account)

## Deployment (Railway)

Set `DATABASE_URL` from your Railway Postgres service. The app runs migrations on boot before serving.

```
next start
```
