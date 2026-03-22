# SaaS Pro Dashboard (React + Express + MySQL)

Application SaaS multi-tenant, multi-utilisateurs, avec JWT, permissions dynamiques, KPI en temps réel, forecasting, module IA rules-based, exports CSV/Excel/PDF et préférences utilisateur.

## Structure

```text
saas-pro-dashboard/
├─ backend/
│  ├─ package.json
│  ├─ env.sample
│  └─ src/
│     ├─ app.js
│     ├─ server.js
│     ├─ config.js
│     ├─ db.js
│     ├─ realtime.js
│     ├─ errors.js
│     ├─ middleware/
│     │  ├─ auth.js
│     │  ├─ authorize.js
│     │  └─ validate.js
│     ├─ services/
│     │  ├─ auth.service.js
│     │  ├─ tenant.js
│     │  ├─ kpi.service.js
│     │  ├─ forecast.service.js
│     │  ├─ ai.service.js
│     │  └─ export.service.js
│     └─ routes/
│        ├─ auth.routes.js
│        ├─ kpi.routes.js
│        ├─ charts.routes.js
│        ├─ forecast.routes.js
│        ├─ ai.routes.js
│        ├─ alerts.routes.js
│        ├─ audit.routes.js
│        ├─ preferences.routes.js
│        └─ export.routes.js
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ index.html
│  └─ src/
│     ├─ main.jsx
│     ├─ App.jsx
│     ├─ api.js
│     ├─ AuthContext.jsx
│     ├─ SocketContext.jsx
│     ├─ Login.jsx
│     └─ Dashboard.jsx
└─ sql/
   ├─ schema.sql
   └─ seed.sql
```

## Fonctionnalités couvertes

- Multi-tenant par `company_id` (isolation des données)
- Rôles: super_admin, admin, manager, accountant, sales
- Permissions dynamiques via `role_permissions`
- JWT auth + middleware auth + middleware permission
- Access token court + refresh token rotatif
- Rate limiting global + auth endpoints
- KPI dynamiques (revenus, charges, profit, rétention) + comparaison mois/trimestre
- Rafraîchissement auto 10s + WebSocket Socket.io
- Graphiques dynamiques revenus / dépenses
- Pagination API sur alertes/audit
- Cache Redis (fallback mémoire) pour KPI/charts
- Forecast moyenne mobile 3 mois
- IA rules-based: résumé, anomalies, recommandations, score santé /100
- Préférences utilisateur sauvegardées en DB
- Export CSV / Excel / PDF
- Historique actions HTTP enrichi (IP, path, statut, durée)
- Migrations SQL versionnées
- Docker + docker-compose
- CI GitHub Actions

## Démarrage

### 1) Base MySQL

Importer dans phpMyAdmin:

1. `sql/schema.sql`
2. `sql/seed.sql`

### 2) Backend

```bash
cd backend
npm install
```

Copier `env.sample` en `.env` puis adapter.

```bash
npm run migrate
npm run dev
```

Backend: `http://localhost:4000`

### 3) Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Comptes seed

- `superadmin@saas.com` / `Admin123!`
- `admin@alpha.com` / `Admin123!`
- `manager@alpha.com` / `Admin123!`

## Endpoints principaux

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/kpi/summary`
- `GET /api/charts/revenues?period=6m|quarter|year&department=Sales`
- `GET /api/charts/expenses-categories?category=Infrastructure`
- `GET /api/forecast`
- `GET /api/ai/insights`
- `GET /api/alerts?page=1&limit=20`
- `GET/PUT /api/preferences/me`
- `GET /api/export?format=csv|excel|pdf`
- `GET /api/audit?page=1&limit=20`

## Migrations versionnées

```bash
cd backend
npm run migrate
```

Migrations disponibles:
- `migrations/001_init.sql`
- `migrations/002_refresh_tokens.sql`

## Docker

```bash
cd saas-pro-dashboard
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`

## Bonnes pratiques prod

- Mettre reverse proxy (Nginx) + TLS
- JWT secret long, rotation et expiration courte + refresh token
- Rate limit + audit complet
- Validation stricte et logs structurés
- Migrations SQL (Prisma/Knex/Sequelize migration)
- Cache Redis pour agrégats KPI lourds
- Queue (BullMQ/RabbitMQ) pour exports lourds et notifications
- Observabilité (Prometheus/Grafana + Sentry)
- CI/CD + tests unitaires/intégration + scan sécurité

