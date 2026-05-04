# AI Usage Report - FinOps - DevSphere - 4TWIN6

## 1. Purpose of this report

This report documents how Artificial Intelligence tools were used during the development of the **FinOps SaaS Platform**. The objective is transparency: AI was used to accelerate work, support debugging, and improve delivery quality, but not to replace engineering judgment.

All AI outputs were reviewed, adapted, and validated before being accepted in the project.

## 2. Project Identification

- Project: **FinOps SaaS Platform**
- Team: **DevSphere**
- Class: **4TWIN6**
- Frontend live URL: `https://multitenant-frontend-uaog.onrender.com/`
- Backend live URL: `https://multitenant-backend-xo8n.onrender.com/`

## 3. AI Tools Used

The following AI tools were used during the project:

- **OpenAI Codex**
- **ChatGPT**
- **Claude**
- **Cursor**
- **Google AI Studio**

## 4. Models, Agents and Environments

### 4.1 Main coding assistant workflow

- OpenAI Codex coding agent
- GPT-5 based coding workflow used through terminal/workspace interaction

### 4.2 Other AI environments

- ChatGPT for explanation, brainstorming, debugging support and documentation reformulation
- Claude for alternative explanations, text restructuring and technical comparison
- Cursor for code completion, rapid edits and local coding assistance inside the editor
- Google AI Studio for UI inspiration, interface ideation and exploration of design directions

## 5. How AI Was Used

### 5.1 Infrastructure and DevOps

AI assistance was used for:

- creating Dockerfiles
- creating Kubernetes manifests
- writing Jenkins CI/CD pipelines
- writing SonarQube configuration
- helping structure deployment fixes for Render and Railway
- helping identify environment variable requirements

### 5.2 Backend development

AI assistance was used for:

- debugging NestJS startup behavior on Render
- fixing backend port exposure
- restructuring startup so HTTP begins even if DB is delayed
- applying a temporary production schema synchronization fix for demo deployment
- clarifying database environment variable usage

### 5.3 Frontend development

AI assistance was used for:

- normalizing frontend API access through `VITE_API_URL`
- reviewing frontend deployment compatibility with Render
- improving environment-variable-based configuration
- helping document frontend live deployment

### 5.4 Testing and quality

AI assistance was used for:

- generating additional Jest unit tests
- checking test commands and coverage behavior
- interpreting SonarQube coverage status
- identifying code quality gaps before deployment

### 5.5 Accessibility

AI assistance was used for:

- identifying accessibility improvements
- improving semantic HTML structure
- proposing ARIA enhancements
- improving keyboard support and accessible feedback behavior
- generating audit structure ideas

### 5.6 Documentation and reporting

- drafting technical explanations
- structuring the README
- drafting the performance report
- drafting the accessibility report
- drafting this AI usage report

### 5.7 UI/UX ideation

The **UI interface was also created and refined with AI support through Google AI Studio**, which was used to explore interface ideas, visual hierarchy, and design direction before implementation and refinement in code.

## 6. Tool-by-Tool Breakdown

### 6.1 OpenAI Codex

Main uses:

- code generation
- code editing
- debugging
- Docker/Jenkins/Kubernetes setup
- backend deployment fixes
- test generation
- README and deliverables preparation

### 6.2 ChatGPT

Main uses:

- explaining technical concepts in simpler language
- helping rephrase documentation
- discussing deployment and environment variable choices
- helping structure final deliverables

### 6.3 Claude

Main uses:

- comparing alternative implementation approaches
- reformulating documentation in a more structured way
- helping improve report readability and organization

### 6.4 Cursor

Main uses:

- assisted coding in the editor
- auto-completion and local code drafting
- accelerating repetitive file editing and refactoring tasks

### 6.5 Google AI Studio

Main uses:

- generating UI ideas
- exploring interface structure and visual inspiration
- helping shape the presentation layer before manual refinement

## 7. Representative Prompt Types

Examples of prompt categories used during the project:

### DevOps / deployment

- create Dockerfiles
- create Kubernetes deployment files
- fix backend startup on Render
- configure frontend API URL for production

### Testing / quality

- generate Jest tests to improve SonarQube coverage
- verify test commands
- explain failing CI behavior

### Accessibility

- improve frontend accessibility with semantic HTML and ARIA
- suggest more accessibility enhancements
- help audit WCAG issues

### Reporting / documentation

- structure deliverables
- rewrite README sections
- produce performance and accessibility summaries

## 8. Validation and Human Review

AI suggestions were not accepted automatically. They were validated through:

- local builds
- Docker builds
- Jest tests
- live deployment checks
- source code review
- Git diff review
- manual functional testing

Examples of validation:

- `npm run build`
- `npm run test:ci`
- Docker rebuilds
- HTTP checks on live URLs
- Render and Railway redeployment retests

## 9. Human Decisions and Critical Thinking

Even when AI was used, final decisions remained human decisions.

Examples:

- deciding which fixes were temporary demo fixes and which were not acceptable for real production
- deciding how to structure deployment between Render and Railway
- deciding how to phrase limitations honestly in the reports
- deciding what remained as technical debt after evaluation

Important examples of critical review:

- `synchronize: true` was accepted only as a temporary academic/demo choice
- frontend API access was returned to environment-variable-based configuration after troubleshooting
- backend startup was redesigned so the app could open the port even before the database was fully ready

## 10. Benefits of AI Usage

AI helped the team:

- save time on repetitive tasks
- accelerate debugging
- improve delivery speed
- improve test coverage
- improve documentation quality
- identify accessibility issues faster
- prepare deployment fixes more efficiently

## 11. Risks and Limitations of AI Usage

The team also observed limitations:

- some generated suggestions were too generic and required adaptation
- deployment advice needed environment-specific review
- AI did not replace project understanding
- all production-related changes still needed human verification

Therefore, AI was used as an assistant, not as an authority.

## 12. Final Statement

The use of AI in this project was intentional, transparent, and critically supervised. AI tools helped improve productivity, but the final responsibility for architecture, testing, deployment, accessibility, and documentation remained entirely with the team.

This report honestly reflects the real use of AI throughout the project lifecycle.
