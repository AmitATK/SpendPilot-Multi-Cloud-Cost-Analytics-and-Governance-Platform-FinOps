# 🚀 SpendPilot  
### **Multi-Cloud Cost Analytics • FinOps • Budget Governance • Anomaly Detection**

<p align="center">
  <img src="images/spendpilot-cover.png" width="800"/>
</p>

---

## 🧩 Tech Stack

### **Frontend**
| Tech | Badge |
|------|-------|
| Angular 20 | ![Angular](https://img.shields.io/badge/Angular-20-red?logo=angular&logoColor=white) |
| TypeScript | ![TS](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) |
| Angular Material | ![Material](https://img.shields.io/badge/Angular%20Material-UI-blueviolet?logo=angular) |
| RxJS | ![RxJS](https://img.shields.io/badge/RxJS-Observables-purple?logo=reactivex) |
| Chart.js + ng2-charts | ![ChartJS](https://img.shields.io/badge/Chart.js-Data%20Viz-orange?logo=chartdotjs) |

### **Backend**
| Tech | Badge |
|------|-------|
| NestJS | ![Nest](https://img.shields.io/badge/NestJS-Framework-red?logo=nestjs) |
| Node.js | ![Node](https://img.shields.io/badge/Node.js-18-green?logo=node.js) |
| PostgreSQL 16 | ![Postgres](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql) |
| JWT Auth | ![JWT](https://img.shields.io/badge/JWT-Auth-purple?logo=jsonwebtokens) |
| Cron Jobs | ![Cron](https://img.shields.io/badge/Cron-Schedulers-yellow) |

---

# ✨ **Features (Production Ready)**

## 📊 **Cloud Cost Dashboard**
- Daily totals  
- Service-level breakdown  
- Line + bar charts  
- `/v1/overview/daily`

## 💰 **Budgets**
- CRUD  
- Auto-evaluation (daily cron)  
- Threshold alerts  
- `/v1/budgets`

## 🚨 **Anomalies**
- Rolling mean + σ  
- EWMA model  
- `/v1/anomalies` + `/v1/anomalies/detect`

## 🔮 **Forecasting**
- EWMA smoothing  
- Weekly seasonality  
- `/v1/overview/forecast?alpha=&h=`

## 🧾 **Showback / Chargeback**
- Org/project level  
- CSV export  
- `/v1/statements`

## 🔔 **Alert Channels**
- Email (SMTP)  
- Slack Webhook  
- CRUD + send-test  
- `/v1/alert-channels`

## 🧹 **Cleanup Engine**
- Idle resource scanner (starter logic)  
- `/v1/cleanup/scan`

## ⛽ **Cost Ingestion**
- AWS CUR ingestion  
- Normalizes into unified schema  
- `/v1/ingest/aws/cur`

## 🔐 **Authentication**
- Register/Login  
- JWT  
- Org-scoping (`X-Org`)  
- RBAC-ready structure

---

# 📦 **Monorepo Layout**

```
finops/
├── finops-web/          # Angular frontend
└── finops-backend/      # NestJS/NodeJS backend API
```

---

# 🚀 Quickstart

## 0) **Prerequisites**

- Node.js 18+
- PostgreSQL 16
- Mailhog (optional) for email testing

---

## 1) **Backend — .env**

Create: `finops-backend/.env`

```
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/finops
JWT_SECRET=devsecret
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
```

---

## 2) **DB Setup + Migrations**

```
createdb finops

psql "$DATABASE_URL" -f migrations/001_schema.sql
psql "$DATABASE_URL" -f migrations/002_seed.sql
psql "$DATABASE_URL" -f migrations/003_auth.sql
```

---

## 3) **Install & Run**

### **Backend**
```
cd finops-backend
npm i
npm start
```
➡️ API: `http://localhost:3000`  
➡️ Swagger: `/docs` (if enabled)

### **Frontend**
```
cd ../finops-web
npm i
npm start
```
➡️ UI: `http://localhost:4200`

---

## 4) **Create a User**

```
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"pass123","name":"Me"}'
```

Default Org (demo):

```
00000000-0000-0000-0000-000000000000
```

All requests require:

```
Authorization: Bearer <jwt>
X-Org: 00000000-0000-0000-0000-000000000000
```

---

# 🔌 **Key API Endpoints**

## Health
```
GET /
GET /healthz
```

## Auth
```
POST /auth/register
POST /auth/login
```

## Overview & Forecast
```
GET /v1/overview/daily?from=&to=
GET /v1/overview/forecast?alpha=0.3&h=30
```

## Budgets
```
GET /v1/budgets
POST /v1/budgets
```

## Anomalies
```
POST /v1/anomalies/detect
GET  /v1/anomalies
```

## Ingest
```
POST /v1/ingest/aws/cur
```

## Alert Channels
```
GET /v1/alert-channels
POST /v1/alert-channels
PUT /v1/alert-channels/:id
DELETE /v1/alert-channels/:id
```

## Statements (Showback)
```
GET /v1/statements?month=YYYY-MM&topN=10
GET /v1/statements/export.csv?month=YYYY-MM
```

---

# 🖥️ **UI Pages**

- Dashboard  
- Budgets  
- Anomalies  
- Forecast  
- Statements (Showback/Chargeback)  
- Alert Channels  
- Cleanup (Idle Resource Scan)  
- Ingest (AWS CUR)  
- Auth (Login/Register)

---

# 🧪 Helpers

Seed mock usage:
```
curl -X POST http://localhost:3000/v1/usage/mock \
  -H "X-Org: 00000000-0000-0000-0000-000000000000"
```

---

# 🏗️ **System Design Architecture**

<p align="center">
  <img src="images/system-architecture.png" width="800"/>
</p>

### **High-Level Architecture**
```
          ┌────────────────────────────┐
          │        Angular UI          │
          │  (Charts, Tables, Auth)    │
          └──────────────┬─────────────┘
                         │ REST API
                         ▼
        ┌─────────────────────────────────┐
        │            NestJS API           │
        │ Auth • Budgets • Anomalies      │
        │ Forecast • Statements • Ingest  │
        └──────────────┬──────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────┐
        │           PostgreSQL            │
        │  usage, budgets, forecasts,     │
        │  anomalies, alerts, statements  │
        └─────────────────────────────────┘

```

---

# 🛡️ **Security**

- JWT authentication  
- Org-level scoping  
- All cost data isolated by `org_id`  
- Input validation + sanitization  
- CORS enabled  
- Helmet + Compression  

---

# 📸 Images (Add these in `/images` folder)
<p>
  <img src="images/Alerts.png" width="800"/>
  <img src="images/Budgets.png" width="800"/>
  <img src="images/Forecast.png" width="800"/>
  <img src="images/Rightsizing.png" width="800"/>
  <img src="images/Statements.png" width="800"/>
</p>

---
