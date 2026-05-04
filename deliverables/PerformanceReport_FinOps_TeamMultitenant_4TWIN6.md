# Performance Report - FinOps - TeamMultitenant - 4TWIN6

## 1. Scope

- Project: FinOps SaaS Platform
- Frontend live URL: `https://multitenant-frontend-uaog.onrender.com/`
- Backend live URL: `https://multitenant-backend-xo8n.onrender.com/`
- Measurement date: `2026-05-04`
- Execution context:
  - Production deployment on Render
  - Backend database on Railway MySQL
  - Automated browser audit generated locally against the live frontend using Lighthouse 13.2.0 and Microsoft Edge headless

## 2. Measurement Method

### Frontend performance tools

- Lighthouse mobile audit
- Lighthouse desktop audit
- Supporting raw files included in this folder:
  - `lighthouse-mobile.report.html`
  - `lighthouse-mobile.report.json`
  - `lighthouse-desktop.report.html`
  - `lighthouse-desktop.report.json`

### API / network benchmarking tools

- PowerShell `Invoke-WebRequest`
- PowerShell `Measure-Command`
- 5 repeated calls per endpoint

## 3. Initial State

### 3.1 Reconstructed initial technical state

No archived early-semester Lighthouse baseline was preserved in the repository. Because of that, the initial state in this report is reconstructed from repository history, build logs, and deployment fixes completed during the project.

Initial issues observed before the final deployment hardening:

- Backend startup could block on database initialization, which prevented the HTTP port from opening reliably on Render.
- Frontend/backend integration temporarily relied on deployment-specific hardcoded API values during troubleshooting, then was normalized back to `VITE_API_URL`.
- The frontend production bundle remained large:
  - main JS chunk: about `917.53 kB`
  - main logo image: about `1,516.56 kB`
- Accessibility before remediation required semantic improvements, ARIA cleanup, keyboard improvements, better form labeling, and clearer status messages.

### 3.2 Optimizations applied during the project

- Dockerized frontend and backend
- Added CI/CD Jenkins pipelines
- Added SonarQube integration and backend test coverage improvements
- Fixed backend startup for Render:
  - bind on `0.0.0.0`
  - use `process.env.PORT || 3000`
  - start HTTP server even if database is not yet ready
- Replaced frontend API hardcoding with `import.meta.env.VITE_API_URL || "http://localhost:3000"`
- Improved accessibility across pages:
  - semantic sections and headers
  - ARIA labels/descriptions
  - dialogs and keyboard support
  - live regions for feedback
  - better icon accessibility

## 4. Current Production Measurements

### 4.1 Lighthouse scores

| Strategy | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| Mobile | 59 | 95 | 96 | 91 |
| Desktop | 94 | 95 | 96 | 91 |

### 4.2 Core Web Vitals / Lighthouse metrics

| Strategy | FCP | LCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|
| Mobile | 3787 ms | 12487 ms | 306 ms | 0.000 | 4342 ms |
| Desktop | 817 ms | 1537 ms | 0 ms | 0.000 | 1119 ms |

### 4.3 API / live response benchmarks

Measured over 5 runs from the production URLs:

| Run | Backend `/health` | Backend `/` | Frontend `/` |
|---|---:|---:|---:|
| 1 | 820 ms | 262 ms | 116 ms |
| 2 | 269 ms | 237 ms | 51 ms |
| 3 | 231 ms | 220 ms | 53 ms |
| 4 | 232 ms | 189 ms | 50 ms |
| 5 | 235 ms | 241 ms | 51 ms |

Average:

- Backend `/health`: `357 ms`
- Backend `/`: `230 ms`
- Frontend `/`: `64 ms`

## 5. Main Performance Findings

### Strengths

- Desktop performance is strong (`94/100`).
- CLS is stable (`0.000`) on both mobile and desktop.
- Backend public routes respond consistently once warm.
- Frontend home page responds quickly from the network perspective.

### Weak points

- Mobile performance is significantly lower than desktop (`59/100`).
- Mobile LCP is too high (`12.487 s`).
- The shipped frontend payload is large.

### Lighthouse opportunities identified

Top mobile opportunities extracted from the Lighthouse report:

- `Improve image delivery`: estimated savings `1,476 KiB`
- `Reduce unused JavaScript`: estimated savings `195 KiB`
- `Render-blocking requests`: estimated savings `1,180 ms`
- Total network payload on mobile: about `1,906 KiB`

These results are coherent with the current build output:

- one large JS bundle
- one very large logo/visual asset

## 6. Interpretation

### What is already acceptable

- The deployed application is stable and publicly accessible.
- Desktop experience is good.
- Public API routes answer correctly.
- Core layout stability is good.

### What still needs optimization after evaluation

- Compress and resize the main logo/hero image
- Split the frontend bundle with dynamic imports
- Reduce unused JavaScript
- Revisit render-blocking resources on the landing page

## 7. Conclusion

The application is deployable and operational in production. The most important deployment blockers were resolved:

- backend port exposure on Render
- startup behavior when database readiness is delayed
- frontend API environment variable management

From a performance perspective, the current production result is:

- `good on desktop`
- `acceptable but improvable on mobile`

The main remaining performance debt is frontend asset weight, especially image delivery and JavaScript bundle size.

## 8. Evidence

Supporting files included in `deliverables/`:

- `lighthouse-mobile.report.html`
- `lighthouse-mobile.report.json`
- `lighthouse-desktop.report.html`
- `lighthouse-desktop.report.json`
