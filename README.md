# Multitenant

Multitenant financial operations platform with a NestJS backend and a React + Vite frontend.

## Embedded AI feature

- Embedded ML expense forecast powered by a TensorFlow.js model trained inside the backend on company expense history.
- Available through the AI dashboard and the `/ai/embedded-ml-forecast` API endpoint.

## Live deployment

- Frontend: `https://multitenant-frontend-uaog.onrender.com/`
- Backend: `https://multitenant-backend-xo8n.onrender.com/`
- Swagger: `https://multitenant-backend-xo8n.onrender.com/docs`

## Project layout

```text
.
|-- backend/      # NestJS API
|-- frontend/     # React + Vite app
|-- package.json  # Root scripts for frontend + backend
|-- vite.config.ts
`-- Dockerfile
```

## Prerequisites

- Node.js 20+
- npm 9+
- MySQL 8 on port `3306`

## Install

```bash
npm install
npm --prefix backend install
```

## Run locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Build

```bash
npm run build:all
```

- Frontend output: `frontend/dist/`
- Backend output: `backend/dist/`

## Environment files

- Frontend: `frontend/.env` based on `frontend/.env.example`
- Backend: `backend/.env` based on `backend/.env.example`

## Docker

```bash
docker build -t multitenant-frontend .
docker build -t multitenant-backend ./backend
```
