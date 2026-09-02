import { verifyAccessToken } from '../utils/tokens.js';
import { prepare as db } from '../db/database.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentification requise.' });
  try {
    const payload = verifyAccessToken(token);
    const user = db(`SELECT id, email, full_name, phone, role, mfa_enabled, school_id FROM users WHERE id = ?`).get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    if (payload.mfa_pending) return res.status(401).json({ error: 'Session MFA incomplète.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expirée ou invalide.' });
  }
}

/** Restreint l'accès à certains rôles. Usage : requireRole('admin','director') */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé : rôle insuffisant.' });
    }
    next();
  };
}

/**
 * ISOLATION PARENT : un parent ne voit que SES enfants.
 * Charge req.ownedStudentIds pour le parent connecté.
 */
export function loadOwnedStudents(req, res, next) {
  if (req.user.role !== 'parent') return next();
  const rows = db(`SELECT student_id FROM parent_students WHERE parent_id = ?`).all(req.user.id);
  req.ownedStudentIds = rows.map((r) => r.student_id);
  next();
}

/** Vérifie que le parent connecté est bien rattaché à l'élève demandé. */
export function canAccessStudent(req, studentId) {
  if (req.user.role !== 'parent') return true;
  return (req.ownedStudentIds || []).includes(Number(studentId));
}
