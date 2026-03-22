import rateLimit from "express-rate-limit";
import { config } from "../config.js";

export const globalRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please retry later." },
});

export const authRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please retry later." },
});

