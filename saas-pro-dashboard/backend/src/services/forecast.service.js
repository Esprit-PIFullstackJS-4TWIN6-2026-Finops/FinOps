import { query } from "../db.js";

export async function buildRevenueForecast(companyId) {
  const rows = await query(
    `
    SELECT DATE_FORMAT(date, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS revenue
    FROM revenues
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      ${companyId ? "AND company_id = ?" : ""}
    GROUP BY month
    ORDER BY month ASC
    `,
    companyId ? [companyId] : [],
  );
  const base = rows.map((r) => Number(r.revenue));
  const movingAvg = base.length ? base.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, base.length) : 0;

  const forecast = [];
  let value = movingAvg;
  for (let i = 1; i <= 3; i += 1) {
    forecast.push({ month_offset: i, forecast_revenue: Number(value.toFixed(2)) });
    value *= 1.01;
  }
  return { history: rows, forecast };
}

