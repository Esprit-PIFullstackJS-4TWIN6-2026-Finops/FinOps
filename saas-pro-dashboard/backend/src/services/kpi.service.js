import dayjs from "dayjs";
import { query } from "../db.js";
import { cacheGet, cacheSet } from "../cache.js";

async function sumByRange(table, companyId, start, end) {
  const params = [start, end];
  let where = "date >= ? AND date < ?";
  if (companyId) {
    where += " AND company_id = ?";
    params.push(companyId);
  }
  const rows = await query(`SELECT COALESCE(SUM(amount), 0) AS total FROM ${table} WHERE ${where}`, params);
  return Number(rows[0].total || 0);
}

function pct(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function getKpiSummary(companyId) {
  const cacheKey = `kpi:summary:${companyId || "all"}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const now = dayjs();
  const mStart = now.startOf("month").format("YYYY-MM-DD");
  const mPrev = now.subtract(1, "month");
  const pmStart = mPrev.startOf("month").format("YYYY-MM-DD");
  const pmEnd = mPrev.endOf("month").add(1, "day").format("YYYY-MM-DD");
  const mEnd = now.endOf("month").add(1, "day").format("YYYY-MM-DD");

  const qStart = now.startOf("quarter").format("YYYY-MM-DD");
  const qPrev = now.subtract(1, "quarter");
  const pqStart = qPrev.startOf("quarter").format("YYYY-MM-DD");
  const pqEnd = qPrev.endOf("quarter").add(1, "day").format("YYYY-MM-DD");
  const qEnd = now.endOf("quarter").add(1, "day").format("YYYY-MM-DD");

  const [rev, exp, revPrev, expPrev, revQ, expQ, revQPrev, expQPrev] = await Promise.all([
    sumByRange("revenues", companyId, mStart, mEnd),
    sumByRange("expenses", companyId, mStart, mEnd),
    sumByRange("revenues", companyId, pmStart, pmEnd),
    sumByRange("expenses", companyId, pmStart, pmEnd),
    sumByRange("revenues", companyId, qStart, qEnd),
    sumByRange("expenses", companyId, qStart, qEnd),
    sumByRange("revenues", companyId, pqStart, pqEnd),
    sumByRange("expenses", companyId, pqStart, pqEnd),
  ]);

  const retentionRows = await query(
    `
    SELECT COALESCE(AVG(retention_rate), 0) AS retention
    FROM revenues
    WHERE date >= ? AND date < ? ${companyId ? "AND company_id = ?" : ""}
    `,
    companyId ? [mStart, mEnd, companyId] : [mStart, mEnd],
  );
  const retention = Number(retentionRows[0].retention || 0);

  const netProfit = rev - exp;
  const netProfitPrev = revPrev - expPrev;
  const netProfitQuarter = revQ - expQ;
  const netProfitQuarterPrev = revQPrev - expQPrev;

  const result = {
    revenue_total: rev,
    expenses_total: exp,
    retention_rate: retention,
    net_profit: netProfit,
    trend_month: {
      revenue_pct: pct(rev, revPrev),
      expenses_pct: pct(exp, expPrev),
      profit_pct: pct(netProfit, netProfitPrev),
    },
    trend_quarter: {
      revenue_pct: pct(revQ, revQPrev),
      expenses_pct: pct(expQ, expQPrev),
      profit_pct: pct(netProfitQuarter, netProfitQuarterPrev),
    },
  };
  await cacheSet(cacheKey, result, 15);
  return result;
}

export async function getRevenue6Months(companyId, { period = "6m", department = "" } = {}) {
  const cacheKey = `kpi:rev6:${companyId || "all"}:${period}:${department || "all"}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const intervalExpr = period === "year" ? "12 MONTH" : period === "quarter" ? "3 MONTH" : "6 MONTH";
  const rows = await query(
    `
    SELECT DATE_FORMAT(date, '%Y-%m') AS ym, COALESCE(SUM(amount), 0) AS total
    FROM revenues
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL ${intervalExpr})
      ${companyId ? "AND company_id = ?" : ""}
      ${department ? "AND department = ?" : ""}
    GROUP BY ym
    ORDER BY ym ASC
    `,
    companyId && department ? [companyId, department] : companyId ? [companyId] : department ? [department] : [],
  );
  const result = rows.map((r) => ({ month: r.ym, revenue: Number(r.total) }));
  await cacheSet(cacheKey, result, 30);
  return result;
}

export async function getExpensesByCategory(companyId, { category = "" } = {}) {
  const cacheKey = `kpi:expcat:${companyId || "all"}:${category || "all"}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const rows = await query(
    `
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      ${companyId ? "AND company_id = ?" : ""}
      ${category ? "AND category = ?" : ""}
    GROUP BY category
    ORDER BY total DESC
    LIMIT 5
    `,
    companyId && category ? [companyId, category] : companyId ? [companyId] : category ? [category] : [],
  );
  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0) || 1;
  const result = rows.map((r) => ({
    category: r.category,
    amount: Number(r.total),
    percentage: (Number(r.total) * 100) / grandTotal,
  }));
  await cacheSet(cacheKey, result, 30);
  return result;
}

