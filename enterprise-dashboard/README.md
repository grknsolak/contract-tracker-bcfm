# Enterprise Dashboard (Next.js + TypeScript)

Production-oriented, executive SaaS dashboard starter built with:
- Next.js App Router
- TypeScript
- TailwindCSS
- shadcn-style UI primitives
- Zustand + React Query
- Framer Motion
- Recharts
- Dark/Light mode (next-themes)

## Run

```bash
cd enterprise-dashboard
npm install
npm run dev
```

Open http://localhost:3000

## Architecture (Feature-first)

- `src/app`: App Router entrypoints and global styles
- `src/components/ui`: reusable design-system primitives
- `src/components/layout`: shell layout (sidebar + top nav)
- `src/components/shared`: cross-feature shared components
- `src/features/dashboard/data`: typed data contracts
- `src/features/dashboard/hooks`: state/data hooks
- `src/features/dashboard/components`: feature widgets (KPI, chart, timeline, table)
- `src/lib`: framework-agnostic helpers/utilities
- `src/providers`: cross-cutting providers (theme/query)

## Scaling Notes

- Keep feature data contracts in `features/*/data`.
- Keep feature orchestration in hooks, keep components mostly presentational.
- Move mock query functions to API layer (`src/services`) when backend is ready.
- Add route-level code splitting with nested routes (`src/app/(dashboard)/...`) as modules grow.

## AI Integration Ideas

- Forecast assistant: anomaly + prediction explanations on KPI cards.
- Executive briefing generator: daily narrative summary from timeline/events.
- Smart risk scoring: churn/renewal probability per contract row.
- Natural language query box: "show me critical renewals next quarter".
