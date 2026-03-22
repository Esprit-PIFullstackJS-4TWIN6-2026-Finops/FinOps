export function resolveCompanyId(req) {
  if (req.user.role_name === "super_admin") {
    return req.query.company_id ? Number(req.query.company_id) : null;
  }
  return Number(req.user.company_id);
}

