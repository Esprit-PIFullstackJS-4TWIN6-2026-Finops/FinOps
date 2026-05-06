# FinOps SaaS Platform

## Overview

**FinOps SaaS Platform** is a full-stack multitenant financial management application designed to help companies manage expenses, invoices, treasury visibility, users, and AI-assisted financial insights.

The platform combines a modern React frontend with a NestJS backend and a MySQL database. It also includes DevOps practices such as Docker, Jenkins CI/CD, SonarQube analysis, Kubernetes deployment manifests, and production cloud deployment.

## Features

- multitenant company management
- expense tracking and categorization
- invoice and client management
- user and membership administration
- audit log and dashboard analytics
- AI-assisted financial insights and forecasting
- embedded internal ML models for financial forecasting
- cloud deployment with live public access

### Embedded AI Features

- embedded ML expense forecast powered by a TensorFlow.js model trained inside the backend on company expense history
- embedded monthly financial forecast model powering the `/ai/forecast` endpoint and dashboard card
- embedded cash-flow projection models powering the `/ai/cash-flow-copilot` endpoint with learned inflow and outflow projections
- AI dashboard integration through:
  - `/ai/embedded-ml-forecast`
  - `/ai/forecast`
  - `/ai/cash-flow-copilot`

## Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- Vitest

### Backend

- NestJS
- TypeScript
- TypeORM
- MySQL
- JWT Authentication
- TensorFlow.js
- Jest

## Architecture

The project follows a full-stack client/server architecture:

- `frontend/`: React + Vite single-page application
- `backend/`: NestJS REST API and business logic
- `MySQL`: persistent relational data storage
- `Docker`: containerization for frontend and backend
- `Jenkins + SonarQube`: CI/CD and code quality automation
- `k8s/`: Kubernetes manifests for MySQL, backend, and frontend deployment

Project layout:

```text
.
|-- backend/      # NestJS API
|-- frontend/     # React + Vite application
|-- k8s/          # Kubernetes manifests
|-- deliverables/ # Final academic reports
|-- package.json  # Root scripts for frontend
|-- vite.config.ts
`-- Dockerfile
```

## Contributors

- Team: **DevSphere**
- Class: **4TWIN6**
- Contributions are traceable through the Git history and repository branch activity.

## Academic Context

This project was developed at **Esprit School of Engineering** - Tunisia as part of the **PI Fullstack JS** academic project during the **Academic Year 2025-2026**.

The work covers:

- full-stack web development
- software architecture
- DevOps automation
- software quality
- accessibility and performance evaluation
- responsible use of AI development tools

## Getting Started

### Live Deployment

- Frontend: `https://multitenant-frontend-uaog.onrender.com/`
- Backend: `https://multitenant-backend-xo8n.onrender.com/`
- Swagger: `https://multitenant-backend-xo8n.onrender.com/docs`

### Prerequisites

- Node.js 20+
- npm 9+
- MySQL 8

### Installation

```bash
npm install
npm --prefix backend install
```

### Environment Files

- Frontend: `frontend/.env` based on `frontend/.env.example`
- Backend: `backend/.env` based on `backend/.env.example`

### Run Locally

```bash
npm run dev
```

Expected local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

### Build

```bash
npm run build:all
```

Build outputs:

- Frontend: `frontend/dist/`
- Backend: `backend/dist/`

### Docker

```bash
docker build -t multitenant-frontend .
docker build -t multitenant-backend ./backend
```

## Acknowledgments

- **Esprit School of Engineering** for the academic framework and project context
- GitHub Education and GitHub for repository hosting and collaboration
- Render and Railway for cloud hosting
- Docker, Jenkins, SonarQube, and Kubernetes for DevOps experimentation
- modern AI-assisted development tools used responsibly during implementation, testing, debugging, and documentation
