import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { authRateLimit } from "../middleware/rate-limit.js";
import { login, loginSchema, logout, refresh, refreshSchema } from "../services/auth.service.js";

const router = Router();

router.post("/login", authRateLimit, validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", authRateLimit, validateBody(refreshSchema), async (req, res, next) => {
  try {
    const result = await refresh(req.body.refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", validateBody(refreshSchema), async (req, res, next) => {
  try {
    await logout(req.body.refresh_token);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: req.user });
});

export default router;

