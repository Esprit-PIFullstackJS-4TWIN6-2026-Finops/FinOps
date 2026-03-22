import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import { config } from "../config.js";
import { query } from "../db.js";
import { HttpError } from "../errors.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(20),
});

function buildTokenPayload(user) {
  return {
    user_id: user.id,
    company_id: user.company_id,
    role_id: user.role_id,
    role_name: user.role_name,
    email: user.email,
  };
}

async function issueTokens(user) {
  const access_token = jwt.sign({ ...buildTokenPayload(user), token_type: "access" }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  const tokenId = crypto.randomUUID();
  const refreshPayload = { ...buildTokenPayload(user), token_id: tokenId, token_type: "refresh" };
  const refresh_token = jwt.sign(refreshPayload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
  const refreshHash = await bcrypt.hash(refresh_token, 10);

  await query(
    `
    INSERT INTO refresh_tokens (user_id, company_id, token_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
    `,
    [user.id, user.company_id || null, tokenId, refreshHash],
  );

  return { access_token, refresh_token };
}

export async function login({ email, password }) {
  const users = await query(
    `
    SELECT u.id, u.company_id, u.role_id, u.full_name, u.email, u.password_hash, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = ? AND u.is_active = 1
    LIMIT 1
    `,
    [email.toLowerCase()],
  );
  if (!users.length) throw new HttpError(401, "Invalid credentials");

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new HttpError(401, "Invalid credentials");

  await query("DELETE FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", [user.id]);
  const { access_token, refresh_token } = await issueTokens(user);

  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      company_id: user.company_id,
      role_id: user.role_id,
      role_name: user.role_name,
      full_name: user.full_name,
      email: user.email,
    },
  };
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }

  const [row] = await query(
    `
    SELECT rt.id, rt.token_hash, u.id AS user_id, u.company_id, u.role_id, u.full_name, u.email, r.name AS role_name
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE rt.token_id = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
    LIMIT 1
    `,
    [payload.token_id],
  );
  if (!row) throw new HttpError(401, "Refresh token expired or revoked");

  const valid = await bcrypt.compare(refreshToken, row.token_hash);
  if (!valid) throw new HttpError(401, "Invalid refresh token");

  await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?", [row.id]);
  const tokens = await issueTokens({
    id: row.user_id,
    company_id: row.company_id,
    role_id: row.role_id,
    role_name: row.role_name,
    email: row.email,
  });
  return {
    ...tokens,
    user: {
      id: row.user_id,
      company_id: row.company_id,
      role_id: row.role_id,
      role_name: row.role_name,
      full_name: row.full_name,
      email: row.email,
    },
  };
}

export async function logout(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_id = ?", [payload.token_id]);
  } catch {
    // ignore invalid token on logout
  }
}

