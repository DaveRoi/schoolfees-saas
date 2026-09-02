import { Router } from 'express';
import { prepare as db } from '../db/database.js';
import { requireAuth, requireRole, loadOwnedStudents, canAccessStudent } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth, loadOwnedStudents);

/**
 * Statistiques d'un élève pour SON année scolaire active.
 * Source de vérité UNIQUE : les échéances (fee_items) de la classe.
 * totalDue = somme des échéances, totalPaid = paiements success associés.
 */
export function studentBalance(studentId) {
  const student = db(`SELECT * FROM students WHERE id = ?`).get(studentId);
  if (!student) return { fees: [], totalDue: 0, totalPaid: 0, balance: 0 };

  const fees = db
    (
      `SELECT fi.id, fi.label, fi.amount, fi.due_date,
              COALESCE(SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END), 0) AS paid
       FROM fee_items fi
       LEFT JOIN payments p ON p.fee_item_id = fi.id
       WHERE fi.class_id = ? AND fi.academic_year_id = (SELECT academic_year_id FROM classes WHERE id = ?)
       GROUP BY fi.id
       ORDER BY fi.due_date`
    )
    .all(student.class_id, student.class_id);
  const totalDue = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0);
  return { fees, totalDue, totalPaid, balance: totalDue - totalPaid };
}

// --- Liste des élèves (staff : tous ; parent : uniquement les siens) ---
router.get('/', (req, res) => {
  if (req.user.role === 'parent') {
    const students = db
      (
        `SELECT s.*, c.name AS class_name, c.annual_fee
         FROM students s JOIN parent_students ps ON ps.student_id = s.id
         JOIN classes c ON c.id = s.class_id
         WHERE ps.parent_id = ? AND s.status = 'active'`
      )
      .all(req.user.id);
    return res.json({ students, note: 'Isolation parent : seuls vos enfants sont visibles.' });
  }
  const students = db
    (
      `SELECT s.*, c.name AS class_name, c.annual_fee FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.school_id = ?
       ORDER BY c.name, s.last_name`
    )
    .all(req.user.school_id);
  res.json({ students });
});

// --- Détail d'un élève + situation financière ---
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!canAccessStudent(req, id)) return res.status(403).json({ error: 'Accès refusé : cet élève n\'est pas rattaché à votre compte.' });
  const student = db
    (
      `SELECT s.*, c.name AS class_name, c.annual_fee, y.label AS academic_year
       FROM students s JOIN classes c ON c.id = s.class_id
       JOIN academic_years y ON y.id = c.academic_year_id
       WHERE s.id = ? AND s.school_id = ?`
    )
    .get(id, req.user.school_id);
  if (!student) return res.status(404).json({ error: 'Élève introuvable.' });
  const parents = db
    (
      `SELECT u.id, u.full_name, u.phone, ps.relation FROM parent_students ps JOIN users u ON u.id = ps.parent_id WHERE ps.student_id = ?`
    )
    .all(id);
  res.json({ student, parents, balance: studentBalance(id) });
});

// --- Création d'un élève (coordinatrice + admin) ---
router.post('/', requireRole('coordinator', 'admin'), (req, res) => {
  const errors = validate(
    {
      first_name: { required: true, min: 2 },
      last_name: { required: true, min: 2 },
      class_id: { required: true, type: 'number' },
      father_name: { required: true, min: 2 },
      mother_name: { required: true, min: 2 },
      guardian_phone: { required: true, pattern: /^\+?6\d{8}$/ },
    },
    req.body
  );
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const cls = db(`SELECT * FROM classes WHERE id = ? AND school_id = ?`).get(Number(req.body.class_id), req.user.school_id);
  if (!cls) return res.status(404).json({ error: 'Classe introuvable.' });

  const info = db
    (
      `INSERT INTO students (school_id, first_name, last_name, birth_date, gender, class_id, father_name, mother_name, guardian_phone, guardian_phone_2)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.school_id,
      req.body.first_name.trim(),
      req.body.last_name.trim(),
      req.body.birth_date || null,
      req.body.gender || null,
      Number(req.body.class_id),
      req.body.father_name.trim(),
      req.body.mother_name.trim(),
      req.body.guardian_phone,
      req.body.guardian_phone_2 || null
    );
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'student.created', entityType: 'student', entityId: info.lastInsertRowid, details: { name: `${req.body.first_name} ${req.body.last_name}` }, ip: req.ip });
  res.status(201).json({ message: 'Élève créé.', studentId: info.lastInsertRowid });
});

// --- Rattachement d'un parent à un élève (multi-tuteurs OK) ---
router.post('/:id/link-parent', requireRole('coordinator', 'admin'), (req, res) => {
  const studentId = Number(req.params.id);
  const parentId = Number(req.body.parent_id);
  const student = db(`SELECT id FROM students WHERE id = ? AND school_id = ?`).get(studentId, req.user.school_id);
  const parent = db(`SELECT id, role FROM users WHERE id = ? AND school_id = ?`).get(parentId, req.user.school_id);
  if (!student || !parent || parent.role !== 'parent') return res.status(404).json({ error: 'Élève ou parent introuvable.' });

  const exists = db(`SELECT id FROM parent_students WHERE parent_id = ? AND student_id = ?`).get(parentId, studentId);
  if (exists) return res.status(409).json({ error: 'Ce parent est déjà rattaché à cet élève.' });

  db(`INSERT INTO parent_students (parent_id, student_id, relation) VALUES (?, ?, ?)`).run(parentId, studentId, req.body.relation || 'tuteur');
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'student.linked_parent', entityType: 'student', entityId: studentId, details: { parentId }, ip: req.ip });
  res.status(201).json({ message: 'Parent rattaché à l\'élève.' });
});

// --- Mise à jour d'un élève (changement de classe inclus) ---
router.patch('/:id', requireRole('coordinator', 'admin'), (req, res) => {
  const id = Number(req.params.id);
  const student = db(`SELECT * FROM students WHERE id = ? AND school_id = ?`).get(id, req.user.school_id);
  if (!student) return res.status(404).json({ error: 'Élève introuvable.' });

  const fields = ['first_name', 'last_name', 'birth_date', 'gender', 'class_id', 'father_name', 'mother_name', 'guardian_phone', 'guardian_phone_2', 'status'];
  const updates = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });

  const setSql = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  db(`UPDATE students SET ${setSql}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(updates), id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'student.updated', entityType: 'student', entityId: id, details: updates, ip: req.ip });
  res.json({ message: 'Élève mis à jour.' });
});

export default router;
