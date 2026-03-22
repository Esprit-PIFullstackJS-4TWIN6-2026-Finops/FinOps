import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { resolveCompanyId } from "../services/tenant.js";
import { buildRevenueForecast } from "../services/forecast.service.js";

const router = Router();

router.get("/", authRequired, authorize("view_forecasts"), async (req, res, next) => {
  try {
    res.json(await buildRevenueForecast(resolveCompanyId(req)));
  } catch (err) {
    next(err);
  }
});

export default router;

