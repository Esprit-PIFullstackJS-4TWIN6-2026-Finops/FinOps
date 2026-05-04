# AI Modules for FinOps SaaS

This document describes the integration of two new AI modules: **Expense Forecasting** and **Urgent Expense Alerts** into the existing NestJS FinOps application.

## Architecture Overview

The AI modules are implemented as sub-modules within the existing `ai` module, maintaining clean separation of concerns:

```
backend/src/ai/
├── ai.module.ts (updated to import new sub-modules)
├── forecasting/
│   ├── forecasting.controller.ts
│   ├── forecasting.service.ts
│   ├── forecasting.module.ts
│   ├── dto/
│   │   ├── forecast-request.dto.ts
│   │   └── forecast-response.dto.ts
│   └── forecasting.service.spec.ts
└── alerts/
    ├── alerts.controller.ts
    ├── alerts.service.ts
    ├── alerts.module.ts
    ├── dto/
    │   ├── alert-request.dto.ts
    │   └── alert-response.dto.ts
    └── alerts.service.spec.ts
```

## Integration Steps

### 1. Code Integration
The new modules are already integrated into the existing codebase. The main changes are:
- Added `ForecastingModule` and `AlertsModule` to `ai/ai.module.ts`
- New endpoints available under `/ai/forecasting` and `/ai/alerts`

### 2. Database
No new tables required. The modules reuse the existing `Expense` entity.

### 3. Dependencies
No new dependencies added. Uses existing TypeORM, NestJS, and validation libraries.

### 4. Authentication & Authorization
Both modules use the existing JWT authentication and role-based guards:
- Accessible by: PLATFORM_ADMIN, OWNER, MANAGER, ACCOUNTANT
- Company data isolation enforced

## API Endpoints

### Expense Forecasting
**GET /ai/forecasting**

Query Parameters:
- `companyId` (required): Company UUID
- `category` (optional): Filter by expense category
- `periodMonths` (optional): Forecast period (1-12 months, default: 3)

Response:
```json
{
  "companyId": "company-uuid",
  "category": "Office Supplies",
  "predictedAmount": 945.50,
  "confidenceScore": 85,
  "trend": "increasing",
  "explanation": "Based on 12 months of historical data. Expenses are trending upward. Prediction for next 3 months: $945.50.",
  "generatedAt": "2024-02-15T10:30:00.000Z"
}
```

### Urgent Expense Alerts
**GET /ai/alerts**

Query Parameters:
- `companyId` (required): Company UUID
- `category` (optional): Filter by expense category

Response: Array of alerts
```json
[
  {
    "expenseId": "expense-uuid",
    "alertLevel": "critical",
    "riskScore": 95,
    "reason": "Expense amount ($1500.00) is extremely unusual for category 'Travel' (3.2 standard deviations from mean)",
    "recommendation": "Review this expense immediately. Consider contacting the vendor or employee for clarification.",
    "detectedAt": "2024-02-15T10:30:00.000Z"
  }
]
```

## Testing

### Unit Tests
Run the tests for the new modules:
```bash
# Run all tests
npm test

# Run specific module tests
npm test forecasting.service.spec.ts
npm test alerts.service.spec.ts
```

### Seed Data
Load sample data for testing:
```sql
-- Execute the contents of backend/data/ai-seed-data.sql
-- Note: Update company_id and created_by with actual UUIDs from your database
```

### Manual Testing Examples

#### Forecasting Example
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/ai/forecasting?companyId=company-123&category=Office%20Supplies&periodMonths=3"
```

#### Alerts Example
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/ai/alerts?companyId=company-123"
```

## Algorithms (V1 Simple Implementation)

### Forecasting Algorithm
- **Data**: Last 12 months of expenses
- **Method**: Linear regression on monthly totals
- **Trend Detection**: Based on slope (>5% increase/decrease threshold)
- **Confidence**: Based on coefficient of variation and data points count

### Alerts Algorithm
- **Baseline**: Statistics from last 6 months by category
- **Detection**: Z-score analysis (standard deviations from mean)
- **Thresholds**:
  - Critical: ≥3 standard deviations
  - High: ≥2.5 standard deviations
  - Medium: ≥2 standard deviations
  - Low: >50% above mean (even if statistically normal)

## Production Readiness

### V1 Features
✅ Simple, maintainable algorithms
✅ Comprehensive error handling
✅ Input validation with class-validator
✅ Swagger documentation
✅ Unit tests with good coverage
✅ TypeORM integration (no new tables)
✅ Authentication & authorization
✅ Company data isolation

### Future Enhancements (V2)
- Machine learning models for better predictions
- Configurable alert thresholds per company
- Historical alert tracking table
- Batch processing for large datasets
- Advanced anomaly detection (isolation forests, etc.)
- Integration with external AI services

## Deployment Notes

1. **Database**: No schema changes required
2. **Environment**: No new environment variables needed
3. **Build**: Standard NestJS build process
4. **Monitoring**: Consider adding metrics for AI service usage

## Troubleshooting

### Common Issues
1. **"Insufficient historical data"**: Need at least 3 months of expense data
2. **Empty alerts**: Normal when expenses are within expected ranges
3. **Low confidence scores**: Indicates high variance in historical data

### Performance
- Forecasting: O(n) where n = historical expenses (optimized with database indexing)
- Alerts: O(m + k) where m = historical expenses, k = recent expenses
- Both modules use efficient TypeORM queries with proper indexing
