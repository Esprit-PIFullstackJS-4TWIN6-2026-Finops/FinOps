import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { resolveCompanyId } from "../services/tenant.js";
import { getExpensesByCategory, getRevenue6Months } from "../services/kpi.service.js";

const router = Router();

router.get("/revenues", authRequired, authorize("view_revenue"), async (req, res, next) => {
  try {
    res.json(
      await getRevenue6Months(resolveCompanyId(req), {
        period: (req.query.period || "6m").toString(),
        department: (req.query.department || "").toString(),
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/expenses-categories", authRequired, authorize("view_expenses"), async (req, res, next) => {
  try {
    res.json(
      await getExpensesByCategory(resolveCompanyId(req), {
        category: (req.query.category || "").toString(),
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;

