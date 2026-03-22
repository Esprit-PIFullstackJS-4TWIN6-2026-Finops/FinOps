import { query } from "../db.js";

export function auditHttp() {
  return (req, res, next) => {
    const start = Date.now();
    res.on("finish", async () => {
      if (!req.user) return;
      if (req.path.startsWith("/health")) return;
      const durationMs = Date.now() - start;
      const meta = {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: durationMs,
        ip: req.ip,
        user_agent: req.headers["user-agent"] || "",
      };
      try {
        await query(
          `INSERT INTO audit_logs (company_id, user_id, action, meta_json) VALUES (?, ?, ?, ?)`,
          [req.user.company_id || null, req.user.user_id, "http_request", JSON.stringify(meta)],
        );
      } catch {
        // non-blocking
      }
    });
    next();
  };
}

