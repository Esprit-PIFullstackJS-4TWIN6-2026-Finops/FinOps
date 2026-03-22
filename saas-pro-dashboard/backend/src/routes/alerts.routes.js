import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { resolveCompanyId } from "../services/tenant.js";
import { getPagination } from "../utils/pagination.js";

const router = Router();

router.get("/", authRequired, authorize("view_alerts"), async (req, res, next) => {
  try {
    const companyId = resolveCompanyId(req);
    const { page, limit, offset } = getPagination(req.query);
    const rows = await query(
      `SELECT id, level, title, description, created_at
       FROM alerts
       ${companyId ? "WHERE company_id = ?" : ""}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      companyId ? [companyId, limit, offset] : [limit, offset],
    );
    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

export default router;

