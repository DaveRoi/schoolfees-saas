import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const TOKEN_TTL_SECONDS = 2 * 3600;

export function generateAccessToken(user, ttl = process.env.JWT_EXPIRES_IN || '2h') {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.full_name, school: user.school_id },
    process.env.JWT_SECRET,
    { expiresIn: ttl }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh', jti: crypto.randomUUID() },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_SECRET);
}

/** Hash du refresh/reset token : on ne stocke jamais le token en clair. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
