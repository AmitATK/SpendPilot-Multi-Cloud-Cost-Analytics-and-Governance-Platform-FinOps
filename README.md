SpendPilot — Multi-Cloud FinOps & Cost Governance

✨ Features (built)

📊 Dashboard — daily spend & service breakdown (/v1/overview/daily)

💰 Budgets — CRUD + evaluation + alerts (/v1/budgets)

🚨 Anomalies — rolling mean/σ + EWMA detect (/v1/anomalies, /v1/anomalies/detect)

🔮 Forecast — EWMA + weekly seasonality (/v1/overview/forecast?alpha=&h=)

🧾 Showback/Chargeback — monthly statements, Top-N filter, CSV export

🔔 Alert Channels — Email/Slack webhook CRUD (UI + API)

🧹 Cleanup — idle candidates (starter scan endpoints)

⛽ Ingest — AWS CUR parsing → unified table (/v1/ingest/aws/cur)

🔐 Auth — Register/Login (JWT), org scoping (X-Org), RBAC guard

🧱 Tech Stack

Frontend: Angular 20, Angular Material, RxJS, Chart.js (ng2-charts)

Backend: NestJS (Node.js/TypeScript), REST, schedulers/cron

DB: PostgreSQL 16 (SQL + JSONB)

📦 Monorepo Layout
finops/
├─ finops-web/        # Angular app (dashboard, budgets, anomalies, forecast, statements, alerts, cleanup, ingest)
└─ finops-backend/    # NestJS API (auth, budgets, anomalies, overview, cleanup, ingest, statements, alert-channels)

🚀 Quickstart
0) Prereqs

Node 18+ / npm

PostgreSQL 16

(Optional) Mailhog/SMTP on localhost:1025 for email tests

1) Backend env

Create finops-backend/.env:

PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/finops
JWT_SECRET=devsecret
SMTP_HOST=127.0.0.1
SMTP_PORT=1025

2) DB & migrations (minimal)
createdb finops
# run SQL files in order (adjust names if different)
psql "$DATABASE_URL" -f finops-backend/migrations/001_schema.sql
psql "$DATABASE_URL" -f finops-backend/migrations/002_seed.sql
psql "$DATABASE_URL" -f finops-backend/migrations/003_auth.sql

3) Install & run
# API
cd finops-backend
npm i
npm start
# -> http://localhost:3000  (Swagger at /docs if enabled)

# Web
cd ../finops-web
npm i
npm start
# -> http://localhost:4200  (uses proxy.conf.json to reach API)

4) Create a user (example)
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"pass123","name":"Me"}'


The app uses JWT (Authorization: Bearer) and org scoping. Default org in demo is:

00000000-0000-0000-0000-000000000000


Most backend calls accept header:

X-Org: 00000000-0000-0000-0000-000000000000


(Angular app handles auth automatically once you log in.)

🔌 Key API Endpoints (sample)
GET  /           -> health page
GET  /healthz

# Auth
POST /auth/register
POST /auth/login

# Overview / Forecast
GET  /v1/overview/daily?from=YYYY-MM-DD&to=YYYY-MM-DD[&service=...]
GET  /v1/overview/forecast?alpha=0.3&h=30

# Budgets
GET  /v1/budgets
POST /v1/budgets         (JSON payload)

# Anomalies
POST /v1/anomalies/detect
GET  /v1/anomalies

# Ingest
POST /v1/ingest/aws/cur  (upload or body payload)

# Alert Channels
GET  /v1/alert-channels
POST /v1/alert-channels
PUT  /v1/alert-channels/:id
DELETE /v1/alert-channels/:id

# Statements (Showback/Chargeback)
GET  /v1/statements?month=YYYY-MM&topN=10
GET  /v1/statements/export.csv?month=YYYY-MM&topN=10  (includes service breakdown)

🖥️ UI Pages

Dashboard: Daily totals & service split (charts)

Budgets: List, create, evaluate; attach alert channels

Anomalies: Trigger & review anomalies

Forecast: Actual vs Forecast (EWMA + weekly seasonality)

Statements: Monthly showback with Top-N & CSV download

Alerts: Manage alert channels (email/Slack), send test

Cleanup: Idle candidates (starter)

Ingest: Upload/trigger ingestion

Auth: Login / Register (Angular Material theme)

🧪 Demo helpers

Seed/mock usage (if present):

curl -X POST http://localhost:3000/v1/usage/mock \
  -H "X-Org: 00000000-0000-0000-0000-000000000000"

🔒 Notes

All org-scoped queries require a valid JWT + X-Org header.

For local emails, run Mailhog (or set SMTP_HOST/PORT to a working SMTP).


🙌 Credits
Built with ❤️ using Angular, NestJS, and PostgreSQL to make cloud spend clear, predictable, and governed.
