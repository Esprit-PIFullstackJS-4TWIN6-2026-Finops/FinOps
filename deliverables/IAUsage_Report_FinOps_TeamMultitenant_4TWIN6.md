# AI Usage Report - FinOps - TeamMultitenant - 4TWIN6

## 1. Purpose of this report

This report documents how AI tools were used during the development, debugging, testing, deployment, and documentation of the FinOps SaaS Platform project.

The objective is transparency. AI assistance was used as a productivity and problem-solving aid, but every change still required developer review, validation, and testing.

## 2. AI tools used

### Main tool used

- OpenAI Codex coding agent in a terminal/workspace environment

### Model / agent family

- GPT-5-based coding agent workflow through Codex

## 3. Tasks where AI assistance was used

AI assistance was used for the following tasks:

### Development and implementation

- Creating Dockerfiles for frontend and backend
- Creating Kubernetes manifests
- Creating Jenkins CI/CD pipeline files
- Creating SonarQube configuration
- Refactoring frontend API calls to use `VITE_API_URL`
- Fixing backend startup for Render
- Fixing backend database startup behavior for delayed DB readiness
- Applying a temporary production schema synchronization fix for Railway/Render demo deployment

### Testing and quality

- Adding Jest unit tests to improve backend coverage
- Checking test scripts and coverage generation
- Reviewing Docker image validity
- Verifying build pipelines

### Accessibility

- Suggesting and implementing accessibility improvements
- Reviewing ARIA usage and semantic HTML patterns
- Improving keyboard navigation and screen-reader support

### Documentation and deliverables

- Drafting deployment notes
- Drafting performance, accessibility, and AI usage documentation
- Structuring README updates

## 4. Representative prompts used

Below are representative prompts used during the project work:

### Infrastructure / DevOps

- `Create Dockerfiles`
- `Create a k8s/ folder at the root of my project for Kubernetes deployment`
- `Crée un fichier à la racine du projet : sonar-project.properties`
- `Modify my Jenkinsfile to trigger the CD pipeline after CI success`

### Testing / coverage

- `Generate additional Jest unit tests for my NestJS project to improve SonarQube coverage`
- `test npm run test:frontend`
- `npm run build`

### Accessibility

- `Improve the accessibility of the React frontend by adding semantic HTML and proper ARIA attributes`
- `donne moi autre exemple pour l accesibilite pour ajouter`

### Deployment fixes

- `Fix my NestJS backend so it works on Render deployment`
- `Fix my React (Vite) frontend to correctly use the backend API deployed on Render`
- `Apply the quick production database fix for Render + Railway`

## 5. How AI outputs were validated

AI-generated or AI-assisted outputs were not accepted blindly. They were validated using:

- local builds
- Docker builds
- backend tests
- live deployment checks
- manual source review
- Git diff review before push

Examples of validation:

- `npm run build`
- `npm run test:ci`
- Docker image rebuilds
- Render/Railway deployment retests
- HTTP checks on live URLs

## 6. Human decisions and critical review

AI helped accelerate implementation, but human review remained necessary for:

- deciding which deployment strategy to keep
- correcting environment variable handling
- checking whether generated code matched the real project structure
- deciding which fixes were temporary demo fixes versus long-term production practices
- validating that accessibility suggestions fit the actual UI

Examples:

- `synchronize: true` was accepted only as a temporary academic/demo fix, not as a long-term production practice
- frontend API URLs were returned to environment-based configuration after temporary hardcoding used during troubleshooting
- backend startup was redesigned so HTTP could start even when the database was not yet ready

## 7. Benefits of AI usage in this project

AI assistance helped:

- reduce debugging time
- speed up repetitive configuration tasks
- improve documentation quality
- increase backend test coverage
- structure deployment fixes faster
- identify accessibility improvements more systematically

## 8. Risks and limitations observed

AI outputs were helpful but not always directly usable without review.

Observed limitations:

- some suggestions required adaptation to the real folder structure
- some deployment advice needed environment-specific correction
- production-grade choices still required human judgment
- performance and accessibility reports still needed real measurement, not only generated text

## 9. Final statement

AI was used as an assistant, not as a replacement for engineering judgment.

The project team remained responsible for:

- architecture decisions
- testing and verification
- deployment configuration
- final code acceptance
- documentation accuracy

This report is intentionally transparent and reflects actual AI-assisted work performed on the project.
