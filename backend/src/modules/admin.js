import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prepare as db } from '../db/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { logAudit } from '../utils/audit.js';
import { getYears } from './academicYears.js';

const router = Router();
// Route de lecture ouverte au staff uniquement (formulaires élèves/échéances)
router.get('/classes', requireAuth, requireRole('admin', 'coordinator', 'director'), (req, res) => {
  const classes = db(
    `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status='active') AS student_count
     FROM classes c WHERE c.school_id = ? ORDER BY c.name`
  ).all(req.user.school_id);
  res.json({ classes });
});

router.use(requireAuth, requireRole('admin'));

// --- Infos école ---
router.get('/school', (req, res) => {
  const school = db(`SELECT * FROM schools WHERE id = ?`).get(req.user.school_id);
  res.json({ school });
});

router.patch('/school', (req, res) => {
  const fields = ['name', 'city', 'address', 'phone', 'email', 'active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = f === 'active' ? (req.body[f] ? 1 : 0) : req.body[f];
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const setSql = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  db(`UPDATE schools SET ${setSql} WHERE id = ?`).run(...Object.values(updates), req.user.school_id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'school.updated', details: updates, ip: req.ip });
  res.json({ message: 'Établissement mis à jour.' });
});

// --- Classes (création/modification : admin uniquement) ---
router.post('/classes', (req, res) => {
  const { name, level, annual_fee, next_class_id, is_terminal, academic_year_id } = req.body;
  if (!name || !level || !annual_fee) return res.status(400).json({ error: 'Nom, niveau et frais annuels requis.' });

  const yearId = academic_year_id || db(`SELECT id FROM academic_years WHERE school_id = ? AND is_current = 1`).get(req.user.school_id)?.id;
  if (!yearId) return res.status(404).json({ error: 'Aucune année scolaire courante.' });

  const exists = db(`SELECT id FROM classes WHERE name = ? AND academic_year_id = ?`).get(name, yearId);
  if (exists) return res.status(409).json({ error: 'Cette classe existe déjà pour cette année.' });

  const info = db
    (`INSERT INTO classes (school_id, name, level, academic_year_id, annual_fee, is_terminal, next_class_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.school_id, name, level, yearId, Math.round(Number(annual_fee)), is_terminal ? 1 : 0, next_class_id || null);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'class.created', entityType: 'class', entityId: info.lastInsertRowid, details: { name }, ip: req.ip });
  res.status(201).json({ message: 'Classe créée.', classId: info.lastInsertRowid });
});

router.patch('/classes/:id', (req, res) => {
  const cls = db(`SELECT * FROM classes WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!cls) return res.status(404).json({ error: 'Classe introuvable.' });
  const fields = ['name', 'level', 'annual_fee', 'next_class_id', 'is_terminal'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = f === 'is_terminal' ? (req.body[f] ? 1 : 0) : req.body[f];
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const setSql = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  db(`UPDATE classes SET ${setSql} WHERE id = ?`).run(...Object.values(updates), cls.id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'class.updated', entityType: 'class', entityId: cls.id, details: updates, ip: req.ip });
  res.json({ message: 'Classe mise à jour.' });
});

// --- Années scolaires ---
router.get('/years', (req, res) => {
  res.json({ years: getYears(req.user.school_id) });
});

router.post('/years/:id/set-current', (req, res) => {
  const year = db(`SELECT * FROM academic_years WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!year) return res.status(404).json({ error: 'Année introuvable.' });
  db(`UPDATE academic_years SET is_current = 0 WHERE school_id = ?`).run(req.user.school_id);
  db(`UPDATE academic_years SET is_current = 1, is_closed = 0 WHERE id = ?`).run(year.id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'year.set_current', details: { label: year.label }, ip: req.ip });
  res.json({ message: `Année courante : ${year.label}.` });
});

// --- Échéances de pension (fee_items) ---
router.get('/fee-items', (req, res) => {
  const items = db
    (
      `SELECT fi.*, c.name AS class_name, y.label AS year_label FROM fee_items fi
       JOIN classes c ON c.id = fi.class_id JOIN academic_years y ON y.id = fi.academic_year_id
       WHERE fi.school_id = ? ORDER BY y.label DESC, c.name, fi.due_date`
    )
    .all(req.user.school_id);
  res.json({ feeItems: items });
});

router.post('/fee-items', (req, res) => {
  const { class_id, label, amount, due_date } = req.body;
  if (!class_id || !label || !amount) return res.status(400).json({ error: 'Classe, libellé et montant requis.' });
  const cls = db(`SELECT * FROM classes WHERE id = ? AND school_id = ?`).get(Number(class_id), req.user.school_id);
  if (!cls) return res.status(404).json({ error: 'Classe introuvable.' });
  const info = db
    (`INSERT INTO fee_items (school_id, class_id, academic_year_id, label, amount, due_date) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(req.user.school_id, cls.id, cls.academic_year_id, label, Math.round(Number(amount)), due_date || null);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'fee_item.created', entityType: 'fee_item', entityId: info.lastInsertRowid, details: { class_id, label, amount }, ip: req.ip });
  res.status(201).json({ message: 'Échéance créée.', feeItemId: info.lastInsertRowid });
});

router.delete('/fee-items/:id', (req, res) => {
  const item = db(`SELECT * FROM fee_items WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!item) return res.status(404).json({ error: 'Échéance introuvable.' });
  const used = db(`SELECT COUNT(*) AS c FROM payments WHERE fee_item_id = ? AND status = 'success'`).get(item.id);
  if (used.c > 0) return res.status(409).json({ error: 'Impossible : des paiements sont rattachés à cette échéance.' });
  db(`DELETE FROM fee_items WHERE id = ?`).run(item.id);
  res.json({ message: 'Échéance supprimée.' });
});

// --- Gestion des comptes utilisateurs (staff + parents) ---
router.get('/users', (req, res) => {
  const users = db(`SELECT id, email, full_name, phone, role, mfa_enabled, created_at FROM users WHERE school_id = ? ORDER BY role, full_name`).all(req.user.school_id);
  res.json({ users });
});

router.post('/users', (req, res) => {
  const errors = validate(
    {
      email: { required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
      password: { required: true, min: 8 },
      full_name: { required: true, min: 2 },
      role: { required: true, enum: ['admin', 'coordinator', 'director', 'parent'] },
    },
    req.body
  );
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const exists = db(`SELECT id FROM users WHERE email = ?`).get(req.body.email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email déjà utilisé.' });

  const info = db
    (`INSERT INTO users (school_id, email, password_hash, full_name, phone, role, consent_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(req.user.school_id, req.body.email.toLowerCase(), bcrypt.hashSync(req.body.password, 10), req.body.full_name, req.body.phone || null, req.body.role);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'user.created_by_admin', entityType: 'user', entityId: info.lastInsertRowid, details: { role: req.body.role }, ip: req.ip });
  res.status(201).json({ message: 'Compte créé.', userId: info.lastInsertRowid });
});

// --- Réinitialisation du mot de passe d'un utilisateur par l'admin (pas besoin de l'ancien) ---
router.post('/users/:id/reset-password', (req, res) => {
  const user = db(`SELECT * FROM users WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  const newPwd = req.body.new_password;
  if (!newPwd || String(newPwd).length < 8) return res.status(400).json({ error: 'Nouveau mot de passe : 8 caractères minimum.' });

  db(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(bcrypt.hashSync(newPwd, 10), user.id);
  db(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(user.id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'user.password_reset_by_admin', entityType: 'user', entityId: user.id, ip: req.ip });
  res.json({ message: `Mot de passe de ${user.full_name} réinitialisé. Ses sessions ont été déconnectées.` });
});

// --- Droit à l'effacement (RGPD) ---
router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte.' });
  const user = db(`SELECT id, full_name FROM users WHERE id = ? AND school_id = ?`).get(id, req.user.school_id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  db(`DELETE FROM parent_students WHERE parent_id = ?`).run(id);
  db(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(id);
  db(`UPDATE users SET full_name = 'ANONYMISÉ', email = 'anonyme-' || id || '@deleted.local', phone = NULL, password_hash = 'deleted', updated_at = datetime('now') WHERE id = ?`).run(id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'user.gdpr_erased', entityType: 'user', entityId: id, ip: req.ip });
  res.json({ message: 'Compte anonymisé (RGPD). Les données comptables sont conservées de façon anonyme.' });
});

// --- Paramètres ---
router.get('/settings', (req, res) => {
  res.json({ settings: db(`SELECT * FROM settings WHERE school_id = ?`).get(req.user.school_id) });
});

router.patch('/settings', (req, res) => {
  const fields = ['pending_expiry_minutes', 'reminder_days', 'auto_advance_days'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = Math.max(1, Math.round(Number(req.body[f])));
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const setSql = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  db(`INSERT INTO settings (school_id) VALUES (?) ON CONFLICT(school_id) DO UPDATE SET ${setSql}, updated_at = datetime('now')`).run(req.user.school_id, ...Object.values(updates));
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'settings.updated', details: updates, ip: req.ip });
  res.json({ message: 'Paramètres mis à jour.' });
});

export default router;
