# Accessibility Report - FinOps - TeamMultitenant - 4TWIN6

## 1. Scope

- Project: FinOps SaaS Platform
- Frontend live URL: `https://multitenant-frontend-uaog.onrender.com/`
- Audit date: `2026-05-04`
- Standard referenced: WCAG 2.1
- Target level: A / AA

## 2. Audit Method

### Automated tools

- Lighthouse accessibility audit
- axe-core through Lighthouse 13.2.0

### Manual/code review checks

- Semantic HTML review in the React frontend
- Keyboard interaction review in shared UI patterns
- Review of labels, ARIA attributes, dialogs, live regions and form descriptions in source code

### Evidence files

- `lighthouse-mobile.report.html`
- `lighthouse-mobile.report.json`
- `lighthouse-desktop.report.html`
- `lighthouse-desktop.report.json`

## 3. Results Summary

| Strategy | Accessibility score |
|---|---:|
| Mobile | 95/100 |
| Desktop | 95/100 |

### Current compliance assessment

- WCAG Level A: substantially covered on the audited interface
- WCAG Level AA: close, but not fully achieved yet because at least one color contrast issue remains

Conclusion:

- The application is broadly accessible and significantly improved.
- It should be considered `near AA`, not `fully AA`, because automated auditing still detects a remaining contrast failure.

## 4. Accessibility Improvements Implemented

The frontend was improved across shared pages/components with the following measures:

- Added semantic page/section structure
- Added `aria-labelledby` on sections, cards, pages and dialogs where relevant
- Added `role="dialog"` and `aria-modal="true"` for modal patterns
- Added `aria-label` for icon-only buttons
- Added `aria-describedby` for form descriptions and validation feedback
- Added `aria-live="polite"` for loading/success/status feedback
- Added `role="alert"` for critical errors
- Added `aria-expanded` and `aria-controls` for expandable UI
- Added `aria-current="page"` for active navigation states
- Added `aria-hidden="true"` to decorative icons
- Improved visible focus behavior
- Replaced non-semantic clickable containers with proper button behavior where needed
- Improved keyboard behavior for dialogs and interactive panels
- Improved table semantics in relevant views

## 5. Main Accessibility Findings

### Passed / improved areas

- Form controls now expose clearer accessible names and descriptions
- Important feedback messages are announced to assistive technologies
- Dialogs and panels are better structured
- Interactive icons are labeled
- Navigation and state feedback are more understandable for screen readers
- Focus visibility and keyboard support are stronger than in the initial codebase

### Remaining issue detected

Automated audit still flags a color contrast issue on the landing page statistics section.

Affected elements:

- `TRANSACTIONS`
- `ENTREPRISES`
- `DISPONIBILITÉ`
- `SUPPORT`

Current detected ratio:

- foreground `#bfdbfe`
- background `#2563eb`
- contrast ratio `3.63:1`
- expected for normal text: `4.5:1`

Impacted selector:

- `section#stats > div.max-w-6xl > div > p.text-primary-200`

WCAG mapping:

- Fails WCAG 2.1 AA contrast requirement for normal text

## 6. Corrective Actions Already Applied

Corrective actions already implemented in the codebase include:

- Accessible labels and names for controls
- Better live announcements
- Better keyboard behavior
- Better dialog semantics
- More semantic section structure
- Better focus handling

These changes explain the strong Lighthouse accessibility score (`95/100`) despite the remaining contrast issue.

## 7. Remaining Corrective Action

To close the remaining gap and reach a stronger AA result:

- Increase contrast of the small labels inside the blue landing stats section

Recommended fix:

- replace `text-primary-200` with a lighter text closer to white
- or darken the blue background
- or increase text size/weight while preserving a compliant ratio

## 8. Final Assessment

The application demonstrates a strong accessibility effort and meaningful conformance progress.

Final assessment:

- `Accessible enough for evaluation and demonstration`
- `Not yet perfect AA due to one remaining contrast issue`

This means the audit is positive overall, while still remaining transparent about the final issue to correct.
