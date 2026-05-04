# Accessibility Report - FinOps - DevSphere - 4TWIN6

## 1. Executive Summary

This report presents the accessibility audit of the **FinOps SaaS Platform** based on WCAG 2.1 principles. The audit shows that the application has undergone significant accessibility improvement and now provides a substantially better experience for keyboard users and assistive technology users.

The global result is positive:

- the application reaches a strong automated accessibility score
- most major semantic and interaction problems were corrected
- one remaining contrast issue prevents claiming full WCAG AA conformity

The overall conclusion is therefore:

- **WCAG A requirements are broadly satisfied**
- **WCAG AA is nearly reached but not fully achieved**

## 2. Project Identification

- Project: **FinOps SaaS Platform**
- Team: **DevSphere**
- Class: **4TWIN6**
- Frontend live URL: `https://multitenant-frontend-uaog.onrender.com/`
- Audit date: `2026-05-04`
- Standard referenced: **WCAG 2.1**
- Target level: **A / AA**

## 3. Audit Scope and Methodology

### 3.1 Scope

The audit covers:

- landing page
- authentication flows
- dashboard and data views
- forms
- modals/dialogs
- shared components and interaction patterns

### 3.2 Tools used

- Lighthouse accessibility audit
- axe-core through Lighthouse 13.2.0
- manual code review
- keyboard interaction review

### 3.3 Evidence files

- `lighthouse-mobile.report.html`
- `lighthouse-mobile.report.json`
- `lighthouse-desktop.report.html`
- `lighthouse-desktop.report.json`

## 4. Accessibility Results

| Strategy | Accessibility score |
|---|---:|
| Mobile | 95/100 |
| Desktop | 95/100 |

### Compliance interpretation

- WCAG Level A: substantially covered
- WCAG Level AA: partially covered, with one remaining contrast failure

This means the application is accessible enough for demonstration and evaluation, while still requiring one final visual correction to present a stronger AA claim.

## 5. Accessibility Improvements Implemented

The following improvements were integrated into the React frontend:

### 5.1 Semantic structure

- better page and section structure
- improved headings and labeled sections
- stronger semantic grouping of content

### 5.2 ARIA and assistive support

- `aria-labelledby` added to important sections, pages, cards and dialogs
- `aria-label` added for icon-only controls
- `aria-describedby` added for helper text and validation feedback
- `aria-live="polite"` added for dynamic feedback
- `role="alert"` added for critical errors
- `aria-expanded` and `aria-controls` added for expandable components
- `aria-current="page"` added for active navigation
- `aria-hidden="true"` added for decorative icons

### 5.3 Keyboard accessibility

- better focus visibility
- improved tab navigation
- improved dialog and panel behavior
- support for keyboard actions on interactive UI patterns

### 5.4 Forms and feedback

- clearer accessible names for controls
- better relationship between labels, fields and messages
- improved success and error announcement behavior

### 5.5 Tables and structured data

- improved table semantics where relevant
- better readability of structured information

## 6. Main Strengths Observed

The audit confirms several important strengths:

- form controls are more understandable for screen readers
- icon-only buttons are properly labeled
- important UI feedback is better announced
- focus handling is noticeably improved
- dialogs and overlays are more accessible
- the interface is more usable with keyboard-only navigation

These changes represent a meaningful accessibility progression compared with the earlier state of the project.

## 7. Remaining Accessibility Issue

### 7.1 Issue detected

The automated audit still detects a **color contrast failure** on the landing page statistics section.

Affected labels:

- `TRANSACTIONS`
- `ENTREPRISES`
- `DISPONIBILITE`
- `SUPPORT`

Impacted selector:

- `section#stats > div.max-w-6xl > div > p.text-primary-200`

Current measured contrast:

- foreground: `#bfdbfe`
- background: `#2563eb`
- ratio: `3.63:1`
- expected ratio for normal text: `4.5:1`

### 7.2 WCAG mapping

This issue affects:

- WCAG 2.1 AA contrast requirement for normal text

## 8. Corrective Recommendation

To close the remaining accessibility gap, the following fix is recommended:

- replace `text-primary-200` with a lighter and more contrasted text color
- or darken the background slightly
- or increase text weight and size while maintaining compliant contrast

This is a focused correction and does not require a full redesign.

## 9. Final Accessibility Assessment

The final accessibility status of the project can be summarized as follows:

- **strong overall accessibility effort**
- **meaningful compliance with WCAG A requirements**
- **near-AA result**
- **one remaining visual contrast issue still documented**

This is a professional and honest outcome for evaluation purposes because it shows both:

- the work completed
- the remaining issue still to be corrected

## 10. Conclusion

The accessibility work performed on the project is substantial and visible in the quality of the current UI. The application is significantly more accessible than a default unreviewed student interface, and it now provides a better experience for keyboard users and assistive technology users.

The application is therefore suitable for final demonstration, with one remaining documented contrast fix required to strengthen full WCAG AA compliance.
