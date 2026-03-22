import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { resolveCompanyId } from "../services/tenant.js";
import { getKpiSummary } from "../services/kpi.service.js";

const router = Router();

router.get("/summary", authRequired, authorize("view_revenue"), async (req, res, next) => {
  try {
    const data = await getKpiSummary(resolveCompanyId(req));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;

