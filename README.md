# FinOps SaaS Platform

Multitenant financial operations dashboard (invoices, expenses, clients, AI insights) with a **NestJS** backend and **React + Vite** frontend.

## Prerequisites

- **Node.js** 20+ recommended  
- **npm** 9+  
- For local backend without MySQL: **SQLite** (enabled by default in `backend/.env.example`)  
- For production-style DB: **MySQL 8** and a created database

## Quick start (full stack)

1. **Clone the repository**

   ```bash
   git clone https://github.com/business-management-saas/Frontend.git
   cd Frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   npm --prefix backend install
   ```

3. **Configure environment**

   - **Frontend** (optional): copy `.env.example` to `.env` and set `VITE_API_URL` if the API is not on `http://localhost:3000`.
   - **Backend**: copy `backend/.env.example` to `backend/.env`.  
     - Default sample uses **SQLite** (`DB_TYPE=sqlite`) so you can run without MySQL.  
     - For MySQL, comment SQLite and uncomment the MySQL block; ensure the server is running and `DB_NAME` exists.

4. **Run both apps**

   ```bash
   npm run dev
   ```

   - Frontend: [http://localhost:5173](http://localhost:5173)  
   - API: [http://localhost:3000](http://localhost:3000)  
   - Swagger: [http://localhost:3000/docs](http://localhost:3000/docs)

5. **Production builds**

   ```bash
   npm run build:all
   ```

   - Frontend output: `dist/`  
   - Backend output: `backend/dist/` — start with `npm --prefix backend run start:prod`

## Environment variables

| Location | Variable | Description |
|----------|----------|-------------|
| Root `.env` | `VITE_API_URL` | Base URL of the Nest API (default `http://localhost:3000`) |
| `backend/.env` | `PORT` | API port (default `3000`) |
| `backend/.env` | `DB_TYPE` | `sqlite` or `mysql` |
| `backend/.env` | `DB_SQLITE_PATH` | SQLite file path when using SQLite |
| `backend/.env` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `backend/.env` | `JWT_SECRET` | Secret for JWT signing (change in production) |
| `backend/.env` | Mail vars | Optional SMTP / Gmail (see `backend/.env.example`) |

## Main features

- **Auth**: login, first-login password change, forgot password  
- **Companies**: registration workflow, multi-company for owners, company settings  
- **Employees & join requests**: invitations, company join flow  
- **Finance**: invoices, expenses, clients, transactions  
- **AI** (when configured): expense analysis, forecast, cost optimization, chat assistant, batch UI translation  
- **Notifications** and **activity logs**  
- **Platform admin**: registration and employee access requests  

## Internationalization (i18n)

### How it works

1. **Base languages**  
   French (`fr`), English (`en`), and Arabic (`ar`) ship with full static strings in `i18n.ts` (single source of truth for keys).

2. **Worldwide languages (dynamic)**  
   Additional languages use **NLLB-style codes** (e.g. `spa_Latn`, `deu_Latn`, `jpn_Jpan`). The app:
   - Lists codes from `GET /ai/languages` merged with a built-in fallback list  
   - Loads English key/value pairs and calls `POST /ai/translate/batch` to fill the UI for the selected language  
   - Caches results in memory per session (`setRuntimeTranslations`)  
   - Falls back to English (then French) if a key or service is missing  

3. **RTL (Arabic and other RTL scripts)**  
   - `document.documentElement.dir` and `lang` are updated from `getLangDir()` / locale  
   - Main shell uses logical spacing where relevant (`ms-*`, `end-*`, `border-e`) plus `dir` on the root layout  

4. **Adding a new *static* language** (fully offline)  
   - Add a new key to the `Lang` union and `translations` object in `i18n.ts`  
   - Add an entry to `LANGUAGES` (label, flag, `dir`)  
   - No change to API routes required  

5. **Adding a language via translation API**  
   - Ensure the code is returned by `/ai/languages` (or appears in `FALLBACK_NLLB_LANGUAGE_CODES` in `App.tsx`)  
   - Users pick it in the language switcher; the batch translation pipeline fills the UI automatically  

6. **New UI strings**  
   - Add the same key to `fr`, `en`, and `ar` in `i18n.ts`  
   - Use `t('your.key', lang)` in components — never hardcode user-visible text  

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + backend (watch) |
| `npm run dev:frontend` | Vite only |
| `npm run dev:backend` | Nest only |
| `npm run build` | Frontend production build |
| `npm run build:all` | Frontend + backend build |
| `npm run test:backend` | Backend Jest (passes if no tests) |

## Project layout

```
├── App.tsx              # Main UI
├── i18n.ts              # Translations + helpers
├── api-backend.ts       # HTTP client for Nest API
├── backend/             # NestJS API
└── types.ts             # Shared frontend types
```

## License

Private / unlicensed — see repository owner.
