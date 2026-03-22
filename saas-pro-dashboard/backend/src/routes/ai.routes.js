import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { resolveCompanyId } from "../services/tenant.js";
import { getKpiSummary } from "../services/kpi.service.js";
import { generateAiInsights } from "../services/ai.service.js";

const router = Router();

router.get("/insights", authRequired, authorize("view_alerts"), async (req, res, next) => {
  try {
    const kpi = await getKpiSummary(resolveCompanyId(req));
    res.json(generateAiInsights(kpi));
  } catch (err) {
    next(err);
  }
});

export default router;

