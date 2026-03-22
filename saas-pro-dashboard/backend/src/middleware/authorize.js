import { query } from "../db.js";
import { HttpError } from "../errors.js";

export function authorize(permissionKey) {
  return async (req, _res, next) => {
    if (req.user?.role_name === "super_admin") return next();

    const rows = await query(
      `
      SELECT p.permission_key
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      `,
      [req.user.role_id],
    );
    const allowed = new Set(rows.map((r) => r.permission_key));
    if (!allowed.has(permissionKey)) {
      return next(new HttpError(403, "Permission denied"));
    }
    return next();
  };
}

