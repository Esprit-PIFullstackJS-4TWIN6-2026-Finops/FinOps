import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { resolveCompanyId } from "../services/tenant.js";
import { getKpiSummary } from "../services/kpi.service.js";
import { generateAiInsights } from "../services/ai.service.js";
import { toCsv, toExcel, toPdf } from "../services/export.service.js";

const router = Router();

router.get("/", authRequired, authorize("export_data"), async (req, res, next) => {
  try {
    const companyId = resolveCompanyId(req);
    const kpi = await getKpiSummary(companyId);
    const ai = generateAiInsights(kpi);
    const rows = [{ ...kpi, executive_summary: ai.executiveSummary, health_score: ai.healthScore }];
    const format = (req.query.format || "csv").toString();

    if (format === "excel") {
      const buffer = await toExcel(rows, "Dashboard");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=dashboard.xlsx");
      return res.send(buffer);
    }
    if (format === "pdf") {
      const pdf = await toPdf("Dashboard Report", rows);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=dashboard.pdf");
      return res.send(pdf);
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=dashboard.csv");
    return res.send(toCsv(rows));
  } catch (err) {
    next(err);
  }
});

export default router;

