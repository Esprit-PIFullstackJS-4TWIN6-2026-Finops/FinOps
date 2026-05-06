# Testing Urgent Expense Alerts

## Overview
This guide explains how to test the fixed urgent expense alerts feature that now works with negative expense amounts.

## What Was Fixed
- Alert detection now uses `Math.abs()` for all calculations
- Implemented 5 practical alert rules instead of statistical-only approach
- Added robust handling for companies with limited expense history
- Enhanced alert response with comprehensive metadata

## Alert Rules Implemented

### RULE 1 — HIGH AMOUNT ANOMALY
- Triggers when expense amount ≥ 2000€
- Alert Level: CRITICAL
- Risk Score: 95

### RULE 2 — EXTREME EXPENSE
- Triggers when expense amount ≥ 1000€
- Alert Level: HIGH
- Risk Score: 85

### RULE 3 — CATEGORY SPIKE
- Triggers when expense is 3x the category's monthly average
- Alert Level: MEDIUM
- Risk Score: 70

### RULE 4 — RAPID SUCCESSIVE LARGE EXPENSES
- Triggers when 2+ expenses ≥ 500€ in same category within 7 days
- Alert Level: MEDIUM
- Risk Score: 65

### RULE 5 — FIRST-TIME LARGE VENDOR EXPENSE
- Triggers when first expense with new vendor ≥ 800€
- Alert Level: LOW
- Risk Score: 50

## Test Data Setup

### 1. Insert Test Data
Run this command in the backend directory:
```bash
npm run seed:alerts
```

This will insert test expenses that should trigger alerts:
- **-5000€ Travel** (Private Jet Charter) → RULE 1 (HIGH AMOUNT ANOMALY)
- **-950€ Office Supplies** (Luxury Office Supplies) → RULE 2 (EXTREME EXPENSE)
- **-2500€ Marketing** (Digital Marketing Agency) → RULE 1 (HIGH AMOUNT ANOMALY)
- **-1800€ IT Equipment** (Tech Solutions Inc) → RULE 3 (CATEGORY SPIKE)
- **-3000€ Consulting** (New Consulting Firm) → RULE 5 (FIRST-TIME LARGE VENDOR)
- **-1200€ & -1100€ Travel** (Business Travel Co) → RULE 4 (RAPID SUCCESSIVE)

### 2. Start the Application
```bash
# Backend
cd backend
npm run start:dev

# Frontend (in another terminal)
cd Frontend
npm run dev
```

### 3. Test in Browser
1. Go to `http://localhost:5173`
2. Navigate to the expenses page
3. Check the "Alertes Urgentes" section
4. You should see alerts for the test expenses above

## Expected Results
Instead of "Aucune alerte urgente détectée", you should now see:
- Multiple critical/high alerts for expenses like -5000€, -950€, etc.
- Each alert showing: amount, category, vendor, date, risk score, reason, recommendation

## Troubleshooting
- If no alerts appear, check browser console for errors
- Verify test data was inserted: `SELECT * FROM expenses WHERE amount < -800;`
- Check backend logs for any alert processing errors
- Ensure the company ID in test data matches your actual company

## Files Modified
- `backend/src/ai/alerts/alerts.service.ts` - Complete rewrite with new rules
- `backend/src/ai/alerts/dto/alert-response.dto.ts` - Added new fields
- `App.tsx` - Enhanced ExpenseAlertsPanel component
- `backend/src/ai/alerts/alerts.service.spec.ts` - Updated tests