# Performance Report - FinOps - DevSphere - 4TWIN6

## 1. Executive Summary

This report presents the production performance evaluation of the **FinOps SaaS Platform** after deployment. The application is publicly available, functionally stable, and deployable in a real hosted environment. Measurements show a strong desktop experience, a good backend responsiveness after warm-up, and a mobile experience that remains usable but still requires optimization.

The most important production blockers were solved before this final report:

- backend startup on Render
- dynamic frontend API configuration with Vite environment variables
- live deployment validation
- performance and accessibility evidence generation

The final result can be summarized as follows:

- **Desktop performance is strong**
- **Backend public routes are responsive**
- **Mobile performance is acceptable for demonstration but should be improved**
- **Main performance debt is frontend asset weight**

## 2. Project Identification

- Project: **FinOps SaaS Platform**
- Team: **DevSphere**
- Class: **4TWIN6**
- Frontend live URL: `https://multitenant-frontend-uaog.onrender.com/`
- Backend live URL: `https://multitenant-backend-xo8n.onrender.com/`
- Swagger URL: `https://multitenant-backend-xo8n.onrender.com/docs`
- Measurement date: `2026-05-04`

## 3. Audit Scope and Methodology

### 3.1 Scope

The performance review covers:

- production frontend rendering
- production backend public responsiveness
- mobile and desktop page quality
- network and loading behavior on live infrastructure

### 3.2 Tools and evidence

The following tools were used:

- Lighthouse 13.2.0
- Microsoft Edge headless
- PowerShell `Invoke-WebRequest`
- PowerShell `Measure-Command`

Supporting evidence included in this folder:

- `lighthouse-mobile.report.html`
- `lighthouse-mobile.report.json`
- `lighthouse-desktop.report.html`
- `lighthouse-desktop.report.json`

### 3.3 Benchmark procedure

- Lighthouse audit on the production frontend
- One mobile audit
- One desktop audit
- Five repeated requests for:
  - frontend home page
  - backend root endpoint
  - backend `/health`

## 4. Initial State and Optimization History

### 4.1 Initial state

A complete early-semester performance baseline was not archived in the repository. Therefore, the initial state was reconstructed using project history, build results, deployment issues, and optimization work completed during the final phase.

Before final hardening, the application had the following weaknesses:

- backend startup could block on database readiness, preventing reliable port exposure on Render
- frontend/backend integration temporarily depended on troubleshooting-specific API URL changes
- frontend payload remained heavy
- accessibility and semantic quality were still incomplete before the dedicated audit/fix phase

### 4.2 Optimizations implemented during the project

The following improvements were applied during development:

- Dockerization of frontend and backend
- CI/CD setup with Jenkins
- SonarQube integration
- backend test coverage improvement with additional Jest unit tests
- backend startup hardening for Render:
  - `process.env.PORT || 3000`
  - bind on `0.0.0.0`
  - HTTP startup independent from delayed DB readiness
- frontend API normalization using `import.meta.env.VITE_API_URL`
- accessibility improvements across pages and shared components

## 5. Lighthouse Scores

### 5.1 Global scores

| Strategy | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| Mobile | 59 | 95 | 96 | 91 |
| Desktop | 94 | 95 | 96 | 91 |

### 5.2 Interpretation

- Desktop performance is excellent for a student full-stack project.
- Accessibility and best practices are consistently strong on both strategies.
- Mobile performance is the main area requiring continued optimization.

## 6. Core Web Vitals and Loading Metrics

| Strategy | FCP | LCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|
| Mobile | 3787 ms | 12487 ms | 306 ms | 0.000 | 4342 ms |
| Desktop | 817 ms | 1537 ms | 0 ms | 0.000 | 1119 ms |

### 6.1 Key observations

- **CLS = 0.000** on both strategies, which indicates strong layout stability.
- **Desktop LCP = 1.537 s**, which is good for a production deployment.
- **Mobile LCP = 12.487 s**, which is too high and is the main weakness in the current build.
- **Desktop TBT = 0 ms**, which indicates a very fluid desktop main thread profile.

## 7. API and Network Benchmarks

Measured over 5 runs against the production deployment:

| Run | Backend `/health` | Backend `/` | Frontend `/` |
|---|---:|---:|---:|
| 1 | 820 ms | 262 ms | 116 ms |
| 2 | 269 ms | 237 ms | 51 ms |
| 3 | 231 ms | 220 ms | 53 ms |
| 4 | 232 ms | 189 ms | 50 ms |
| 5 | 235 ms | 241 ms | 51 ms |

### Average values

- Backend `/health`: `357 ms`
- Backend `/`: `230 ms`
- Frontend `/`: `64 ms`

### Interpretation

- The first backend request is slower, which is expected on a hosted environment due to warm-up.
- After warm-up, backend responses stabilize around the low `200 ms` range.
- The frontend home page responds quickly from a pure network perspective.

## 8. Main Bottlenecks Identified

### 8.1 Largest mobile bottlenecks

The Lighthouse reports point to the following bottlenecks:

- `Improve image delivery`: estimated savings `1,476 KiB`
- `Reduce unused JavaScript`: estimated savings `195 KiB`
- `Render-blocking requests`: estimated savings `1,180 ms`
- total payload size on mobile: about `1,906 KiB`

### 8.2 Build evidence

These findings are coherent with the frontend build:

- one large JavaScript bundle
- one large image asset used in the UI

## 9. Performance Strengths

The application shows several strong performance qualities:

- stable layout rendering
- efficient desktop execution
- correct production routing and deployment behavior
- healthy public API endpoints
- strong best-practices score

## 10. Remaining Optimization Opportunities

The following improvements should be considered after evaluation:

### Frontend

- compress and resize the main logo/visual asset
- lazy-load non-critical sections or modules
- split the main JavaScript bundle
- reduce render-blocking resources on the landing page

### Backend

- keep monitoring warm-up behavior on hosted infrastructure
- optimize startup sequence after academic deployment if production hardening continues

## 11. Final Assessment

The project is successfully deployed and operational in production. From a performance point of view:

- **desktop experience is strong**
- **backend responsiveness is acceptable to good**
- **mobile performance still needs optimization**

This means the project is submission-ready for evaluation, while still leaving clear room for improvement in mobile asset delivery and frontend bundle optimization.

## 12. Conclusion

The final production version demonstrates that the team successfully delivered:

- a deployed full-stack application
- measurable performance evidence
- documented optimization work
- a realistic analysis of current strengths and remaining limitations

For an academic PI full-stack project, the current result is technically credible, measurable, and professionally documented.
