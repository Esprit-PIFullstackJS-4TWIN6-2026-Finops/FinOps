import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const prefsSchema = z.object({
  kpis: z.array(z.string()).default([]),
  charts: z.array(z.string()).default([]),
  theme: z.enum(["light", "dark"]).default("light"),
  layout: z.array(z.string()).default([]),
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const rows = await query("SELECT preferences_json FROM user_preferences WHERE user_id = ? LIMIT 1", [req.user.user_id]);
    const prefs = rows.length ? JSON.parse(rows[0].preferences_json) : { kpis: [], charts: [], theme: "light", layout: [] };
    res.json(prefs);
  } catch (err) {
    next(err);
  }
});

router.put("/me", authRequired, validateBody(prefsSchema), async (req, res, next) => {
  try {
    await query(
      `
      INSERT INTO user_preferences (user_id, company_id, preferences_json)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE preferences_json = VALUES(preferences_json)
      `,
      [req.user.user_id, req.user.company_id, JSON.stringify(req.body)],
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

