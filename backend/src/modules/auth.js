import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import { prepare as db, transaction } from '../db/database.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  TOKEN_TTL_SECONDS,
} from '../utils/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../utils/validate.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

function publicUser(u) {
  return { id: u.id, email: u.email, full_name: u.full_name, phone: u.phone, role: u.role, mfa_enabled: !!u.mfa_enabled, school_id: u.school_id };
}

/** Crée la session en base + retourne les tokens. */
function issueSession(user, req) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  db(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, datetime('now', '+7 days'))`
  ).run(user.id, hashToken(refreshToken), req.headers['user-agent'] || null, req.ip);
  return { accessToken, refreshToken };
}

// --- Inscription PARENT (self-signup, rattachée à une école par son code) ---
router.post('/register', authLimiter, (req, res) => {
  const errors = validate(
    {
      email: { required: true, type: 'string', pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
      password: { required: true, min: 8 },
      full_name: { required: true, min: 2 },
      phone: { required: true, pattern: /^\+?6\d{8}$/ },
      school_code: { required: true, type: 'string', min: 4 },
      consent: { required: true },
    },
    req.body
  );
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  if (req.body.consent !== true) return res.status(400).json({ error: 'Consentement RGPD requis.' });

  const school = db(`SELECT id, name, active FROM schools WHERE UPPER(code) = ?`).get(String(req.body.school_code).toUpperCase().trim());
  if (!school) return res.status(404).json({ error: 'Code école inconnu. Vérifiez auprès de l\'établissement.' });
  if (!school.active) return res.status(403).json({ error: 'Cet établissement n\'accepte pas de nouvelles inscriptions pour le moment.' });

  const existing = db(`SELECT id FROM users WHERE email = ?`).get(req.body.email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });

  const hash = bcrypt.hashSync(req.body.password, 10);
  const info = db
    (
      `INSERT INTO users (school_id, email, password_hash, full_name, phone, role, consent_at)
       VALUES (?, ?, ?, ?, ?, 'parent', datetime('now'))`
    )
    .run(school.id, req.body.email.toLowerCase(), hash, req.body.full_name.trim(), req.body.phone);

  logAudit({ schoolId: school.id, userId: info.lastInsertRowid, userName: req.body.full_name, action: 'user.register', entityType: 'user', entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json({ message: 'Compte créé. Vous pouvez vous connecter.', school: { name: school.name } });
});

// --- Login (étape 1 : email + mot de passe ; MFA si activé) ---
router.post('/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const user = db(`SELECT * FROM users WHERE email = ?`).get(String(email).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAudit({ action: 'user.login_failed', entityType: 'user', details: { email }, ip: req.ip });
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  if (user.mfa_enabled) {
    const tempToken = generateAccessToken({ ...user, mfa_pending: true }, '10m');
    return res.json({ mfa_required: true, mfa_token: tempToken, message: 'Code MFA requis.' });
  }

  const { accessToken, refreshToken } = issueSession(user, req);
  logAudit({ schoolId: user.school_id, userId: user.id, userName: user.full_name, action: 'user.login', entityType: 'user', entityId: user.id, ip: req.ip });
  res.json({ user: publicUser(user), accessToken, refreshToken });
});

// --- Login (étape 2 : vérification code MFA) ---
router.post('/mfa/verify', authLimiter, (req, res) => {
  const { mfa_token, code } = req.body;
  if (!mfa_token || !code) return res.status(400).json({ error: 'Token et code MFA requis.' });
  let payload;
  try {
    payload = verifyAccessToken(mfa_token);
  } catch {
    return res.status(401).json({ error: 'Session MFA expirée. Reconnectez-vous.' });
  }
  const user = db(`SELECT * FROM users WHERE id = ?`).get(payload.sub);
  if (!user || !user.mfa_enabled) return res.status(400).json({ error: 'MFA non activé pour ce compte.' });

  if (!authenticator.check(String(code), user.mfa_secret)) {
    logAudit({ schoolId: user.school_id, userId: user.id, action: 'user.mfa_failed', ip: req.ip });
    return res.status(401).json({ error: 'Code MFA incorrect.' });
  }
  const { accessToken, refreshToken } = issueSession(user, req);
  logAudit({ schoolId: user.school_id, userId: user.id, userName: user.full_name, action: 'user.login_mfa', ip: req.ip });
  res.json({ user: publicUser(user), accessToken, refreshToken });
});

// --- Activation MFA : génère un secret + QR (otpauth URL) ---
router.post('/mfa/setup', requireAuth, (req, res) => {
  const secret = authenticator.generateSecret();
  db(`UPDATE users SET mfa_secret = ?, updated_at = datetime('now') WHERE id = ?`).run(secret, req.user.id);
  const otpauth = authenticator.keyuri(req.user.email, 'SchoolFees SaaS', secret);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'user.mfa_setup_started', ip: req.ip });
  res.json({ secret, otpauth_url: otpauth, message: 'Scannez ce secret dans Google Authenticator, puis confirmez avec /mfa/confirm.' });
});

// --- Confirmation MFA ---
router.post('/mfa/confirm', requireAuth, (req, res) => {
  const { code } = req.body;
  const user = db(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!user.mfa_secret) return res.status(400).json({ error: 'Setup MFA non initié.' });
  if (!code || !authenticator.check(String(code), user.mfa_secret)) return res.status(400).json({ error: 'Code incorrect, réessayez.' });
  db(`UPDATE users SET mfa_enabled = 1, updated_at = datetime('now') WHERE id = ?`).run(req.user.id);
  logAudit({ schoolId: user.school_id, userId: user.id, userName: user.full_name, action: 'user.mfa_enabled', ip: req.ip });
  res.json({ message: 'MFA activé avec succès.' });
});

// --- Désactivation MFA (mot de passe exigé) ---
router.post('/mfa/disable', requireAuth, (req, res) => {
  const user = db(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!req.body.password || !bcrypt.compareSync(req.body.password, user.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  db(`UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = datetime('now') WHERE id = ?`).run(req.user.id);
  logAudit({ schoolId: user.school_id, userId: user.id, userName: user.full_name, action: 'user.mfa_disabled', ip: req.ip });
  res.json({ message: 'MFA désactivé.' });
});

// --- Refresh token (session vérifiée en base = révocable) ---
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token requis.' });
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
  }
  const session = db(
    `SELECT s.*, u.school_id FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')`
  ).get(hashToken(refreshToken));
  if (!session) return res.status(401).json({ error: 'Session révoquée ou expirée. Reconnectez-vous.' });

  const user = db(`SELECT * FROM users WHERE id = ?`).get(payload.sub);
  if (!user || user.id !== session.user_id) return res.status(401).json({ error: 'Session invalide.' });

  res.json({ accessToken: generateAccessToken(user) });
});

// --- Logout : révoque la session côté serveur ---
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    db(`UPDATE sessions SET revoked_at = datetime('now') WHERE refresh_token_hash = ?`).run(hashToken(refreshToken));
  }
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'user.logout', ip: req.ip });
  res.json({ message: 'Déconnecté.' });
});

// --- Liste de mes appareils connectés ---
router.get('/sessions', requireAuth, (req, res) => {
  const sessions = db(
    `SELECT id, user_agent, ip, created_at, expires_at FROM sessions
     WHERE user_id = ? AND revoked_at IS NULL AND expires_at > datetime('now')
     ORDER BY created_at DESC`
  ).all(req.user.id);
  res.json({ sessions });
});

// --- Déconnexion d'un appareil précis ---
router.post('/sessions/:id/revoke', requireAuth, (req, res) => {
  db(`UPDATE sessions SET revoked_at = datetime('now') WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user.id);
  res.json({ message: 'Appareil déconnecté.' });
});

// --- Profil courant ---
router.get('/me', requireAuth, (req, res) => {
  const { id, email, full_name, phone, role, mfa_enabled, school_id, created_at } = req.user;
  const school = db(`SELECT name, code, city FROM schools WHERE id = ?`).get(school_id);
  res.json({ user: { id, email, full_name, phone, role, mfa_enabled, school_id, school, created_at } });
});

// --- Changement de mot de passe (révoque toutes les autres sessions) ---
router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis.' });
  if (String(new_password).length < 8) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });

  const user = db(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

  const hash = bcrypt.hashSync(new_password, 10);
  transaction(() => {
    db(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, user.id);
    db(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL AND refresh_token_hash != ?`).run(
      user.id,
      hashToken(req.body.refreshToken || '')
    );
  });
  logAudit({ schoolId: user.school_id, userId: user.id, userName: user.full_name, action: 'user.password_changed', ip: req.ip });
  res.json({ message: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.' });
});

// --- Demande de réinitialisation (retourne le lien/token : brancher un service SMS/email en prod) ---
router.post('/password/forgot', authLimiter, (req, res) => {
  const user = db(`SELECT * FROM users WHERE email = ?`).get(String(req.body.email || '').toLowerCase());
  // Réponse identique que le compte existe ou non (pas de divulgation)
  if (!user) return res.json({ message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.' });

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  db(`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`).run(user.id, hashToken(token), expires);

  // En production : envoyer ce code par SMS/email (Africa's Talking, etc.)
  sendResetCode(user, token);
  logAudit({ schoolId: user.school_id, userId: user.id, action: 'user.password_reset_requested', ip: req.ip });
  res.json({ message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.', demo_token: process.env.NODE_ENV === 'production' ? undefined : token });
});

// --- Validation du code + nouveau mot de passe ---
router.post('/password/reset', authLimiter, (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) return res.status(400).json({ error: 'Email, code et nouveau mot de passe requis.' });
  if (String(new_password).length < 8) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });

  const user = db(`SELECT * FROM users WHERE email = ?`).get(String(email).toLowerCase());
  const reset = user && db(
    `SELECT * FROM password_resets WHERE user_id = ? AND token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
     ORDER BY id DESC LIMIT 1`
  ).get(user.id, hashToken(String(code).toUpperCase()));

  if (!reset) return res.status(400).json({ error: 'Code invalide ou expiré.' });

  const hash = bcrypt.hashSync(new_password, 10);
  transaction(() => {
    db(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, user.id);
    db(`UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`).run(reset.id);
    db(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(user.id);
  });
  logAudit({ schoolId: user.school_id, userId: user.id, action: 'user.password_reset_done', ip: req.ip });
  res.json({ message: 'Mot de passe réinitialisé. Connectez-vous.' });
});

/** À remplacer par un vrai envoi SMS/email en production. */
function sendResetCode(user, token) {
  db(
    `INSERT INTO notifications (school_id, channel, recipient_phone, recipient_name, message, purpose, status)
     VALUES (?, 'sms', ?, ?, ?, 'password_reset', 'sent')`
  ).run(user.school_id, user.phone, user.full_name, `Code de reinitialisation SchoolFees : ${token}. Valable 30 minutes. Ne le partagez jamais.`);
  console.log(`[reset:simulate] Code de réinitialisation pour ${user.email} : ${token}`);
}

export default router;
