import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { resolveCompanyId } from "../services/tenant.js";
import { getPagination } from "../utils/pagination.js";

const router = Router();

router.get("/", authRequired, async (req, res, next) => {
  try {
    const companyId = resolveCompanyId(req);
    const { page, limit, offset } = getPagination(req.query);
    const rows = await query(
      `
      SELECT id, company_id, user_id, action, meta_json, created_at
      FROM audit_logs
      ${companyId ? "WHERE company_id = ?" : ""}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      companyId ? [companyId, limit, offset] : [limit, offset],
    );
    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

export default router;

