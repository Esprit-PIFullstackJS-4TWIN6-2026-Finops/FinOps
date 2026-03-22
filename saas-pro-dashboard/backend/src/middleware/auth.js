import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../errors.js";

export function authRequired(req, _res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return next(new HttpError(401, "Missing token"));
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.token_type === "refresh") {
      return next(new HttpError(401, "Invalid access token"));
    }
    req.user = decoded;
    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired token"));
  }
}

