import { HttpError } from "../errors.js";

export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new HttpError(400, parsed.error.issues.map((i) => i.message).join(", ")));
    }
    req.body = parsed.data;
    return next();
  };
}

