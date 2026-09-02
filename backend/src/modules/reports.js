import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prepare as db, transaction } from '../db/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { getCurrentYear, getYearAdvanceStatus, advanceToNextYear } from './academicYears.js';

const router = Router();
router.use(requireAuth, requireRole('director', 'admin', 'coordinator'));

/** Agrégats temps réel pour le dashboard — année scolaire courante uniquement. */
export function dashboardStats(schoolId) {
  const year = getCurrentYear(schoolId);

  const totalExpected = db(
    `SELECT COALESCE(SUM(fi.amount * (SELECT COUNT(*) FROM parent_students ps JOIN students s ON s.id = ps.student_id
        WHERE s.class_id = fi.class_id AND s.status='active')),0) AS v
     FROM fee_items fi WHERE fi.academic_year_id = ?`
  ).get(year.id).v;

  const totalCollected = db(
    `SELECT COALESCE(SUM(p.amount),0) AS v FROM payments p
     WHERE p.school_id = ? AND p.status = 'success'
       AND p.fee_item_id IN (SELECT id FROM fee_items WHERE academic_year_id = ?)`
  ).get(schoolId, year.id).v;

  const todayCollected = db(
    `SELECT COALESCE(SUM(amount),0) AS v FROM payments
     WHERE school_id = ? AND status='success' AND date(paid_at) = date('now')
       AND fee_item_id IN (SELECT id FROM fee_items WHERE academic_year_id = ?)`
  ).get(schoolId, year.id).v;

  const monthCollected = db(
    `SELECT COALESCE(SUM(amount),0) AS v FROM payments
     WHERE school_id = ? AND status='success' AND strftime('%Y-%m', paid_at) = strftime('%Y-%m','now')
       AND fee_item_id IN (SELECT id FROM fee_items WHERE academic_year_id = ?)`
  ).get(schoolId, year.id).v;

  const byClass = db
    (
      `SELECT c.name AS class_name, c.annual_fee, c.is_terminal,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status='active') AS student_count,
              COALESCE((SELECT SUM(p.amount) FROM payments p JOIN students s ON s.id = p.student_id
                        WHERE s.class_id = c.id AND p.status='success'
                          AND p.fee_item_id IN (SELECT id FROM fee_items WHERE academic_year_id = ?)), 0) AS collected,
              COALESCE((SELECT SUM(fi.amount) FROM fee_items fi WHERE fi.class_id = c.id AND fi.academic_year_id = ?), 0) AS expected
       FROM classes c WHERE c.academic_year_id = ? ORDER BY c.name`
    )
    .all(year.id, year.id, year.id);

  const daily = db
    (
      `SELECT date(paid_at) AS day, SUM(amount) AS total, COUNT(*) AS count
       FROM payments WHERE school_id = ? AND status='success' AND paid_at >= date('now','-14 days')
         AND fee_item_id IN (SELECT id FROM fee_items WHERE academic_year_id = ?)
       GROUP BY date(paid_at) ORDER BY day`
    )
    .all(schoolId, year.id);

  const recent = db
    (
      `SELECT p.id, p.amount, p.method, p.status, p.paid_at, s.first_name, s.last_name, c.name AS class_name, u.full_name AS parent_name
       FROM payments p JOIN students s ON s.id = p.student_id JOIN classes c ON c.id = s.class_id
       JOIN users u ON u.id = p.parent_id
       WHERE p.school_id = ? ORDER BY p.created_at DESC LIMIT 10`
    )
    .all(schoolId);

  const unpaidStudents = db
    (
      `SELECT s.id, s.first_name, s.last_name, c.name AS class_name,
              COALESCE((SELECT SUM(fi.amount) FROM fee_items fi WHERE fi.class_id = c.id AND fi.academic_year_id = ?), c.annual_fee) AS total_due,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id AND p.status='success'
                        AND p.fee_item_id IN (SELECT id FROM fee_items WHERE academic_year_id = ?)), 0) AS paid
       FROM students s JOIN classes c ON c.id = s.class_id
       WHERE s.school_id = ? AND s.status='active'
       ORDER BY (total_due - paid) DESC`
    )
    .all(year.id, year.id, schoolId)
    .filter((s) => s.paid < s.total_due);

  const yearStatus = getYearAdvanceStatus(schoolId);
  return { year, totalExpected, totalCollected, todayCollected, monthCollected, byClass, daily, recent, unpaidStudents, yearStatus };
}

router.get('/dashboard', (req, res) => {
  res.json(dashboardStats(req.user.school_id));
});

// --- Journal des notifications ---
router.get('/notifications', (req, res) => {
  const notifications = db(`SELECT * FROM notifications WHERE school_id = ? ORDER BY created_at DESC LIMIT 200`).all(req.user.school_id);
  res.json({ notifications });
});

// --- Rapports d'audit ---
router.get('/audit', requireRole('director', 'admin'), (req, res) => {
  const logs = db(`SELECT * FROM audit_logs WHERE school_id = ? ORDER BY created_at DESC LIMIT 500`).all(req.user.school_id);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'audit.viewed', ip: req.ip });
  res.json({ logs });
});

// --- Export CSV (encaissements, période optionnelle ?from=YYYY-MM-DD&to=YYYY-MM-DD) ---
router.get('/export/payments.csv', (req, res) => {
  const { from, to } = req.query;
  let sql = `SELECT p.id, p.paid_at, s.first_name || ' ' || s.last_name AS eleve, c.name AS classe,
                    u.full_name AS parent, p.amount, p.method, p.provider_ref, p.status
             FROM payments p JOIN students s ON s.id = p.student_id JOIN classes c ON c.id = s.class_id
             JOIN users u ON u.id = p.parent_id WHERE p.school_id = ?`;
  const params = [req.user.school_id];
  if (from) { sql += ` AND date(p.paid_at) >= ?`; params.push(from); }
  if (to) { sql += ` AND date(p.paid_at) <= ?`; params.push(to); }
  sql += ` ORDER BY p.paid_at DESC`;
  const rows = db(sql).all(...params);

  const header = ['ID', 'Date', 'Eleve', 'Classe', 'Parent', 'Montant FCFA', 'Moyen', 'Ref operateur', 'Statut'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(';'), ...rows.map((r) => [r.id, r.paid_at, r.eleve, r.classe, r.parent, r.amount, r.method, r.provider_ref, r.status].map(esc).join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="encaissements-${from || 'debut'}_${to || 'aujourd-hui'}.csv"`);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'report.exported_csv', details: { from, to, rows: rows.length }, ip: req.ip });
  res.send('\uFEFF' + csv);
});

// --- Export PDF : rapport mensuel de clôture ---
router.get('/export/monthly.pdf', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const rows = db
    (
      `SELECT p.*, s.first_name, s.last_name, c.name AS class_name, u.full_name AS parent_name, sc.name AS school_name
       FROM payments p JOIN students s ON s.id = p.student_id JOIN classes c ON c.id = s.class_id
       JOIN users u ON u.id = p.parent_id JOIN schools sc ON sc.id = p.school_id
       WHERE p.school_id = ? AND p.status='success' AND strftime('%Y-%m', p.paid_at) = ? ORDER BY p.paid_at`
    )
    .all(req.user.school_id, month);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const schoolName = rows[0]?.school_name || db(`SELECT name FROM schools WHERE id = ?`).get(req.user.school_id).name;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cloture-${month}.pdf"`);
  doc.pipe(res);
  doc.fontSize(20).fillColor('#1e3a5f').text(`Rapport de clôture - ${month}`, { align: 'center' });
  doc.fontSize(11).fillColor('#666').text(schoolName, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#000').text(`Total encaissé : ${total.toLocaleString('fr-FR')} FCFA sur ${rows.length} paiement(s)`);
  doc.moveDown(0.5);
  rows.forEach((r, i) => {
    if (i % 28 === 0 && i > 0) doc.addPage();
    doc.fontSize(9).text(`${r.paid_at} - ${r.first_name} ${r.last_name} (${r.class_name}) - ${r.parent_name} - ${r.amount.toLocaleString('fr-FR')} FCFA - ${r.method} - ${r.provider_ref}`);
  });
  doc.end();
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'report.exported_pdf', details: { month, total }, ip: req.ip });
});

// --- Export PDF : situation complète des impayés (outil de recouvrement) ---
router.get('/export/unpaid.pdf', (req, res) => {
  const stats = dashboardStats(req.user.school_id);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="impayes-${new Date().toISOString().slice(0, 10)}.pdf"`);
  doc.pipe(res);
  doc.fontSize(20).fillColor('#1e3a5f').text('Liste des impayés', { align: 'center' });
  doc.fontSize(11).fillColor('#666').text(`${stats.unpaidStudents.length} élève(s) concerné(s) - ${stats.year.label}`, { align: 'center' });
  doc.moveDown(1);
  stats.unpaidStudents.forEach((s, i) => {
    if (i % 30 === 0 && i > 0) doc.addPage();
    doc.fontSize(10).text(`${s.last_name} ${s.first_name} (${s.class_name}) - payé : ${s.paid.toLocaleString('fr-FR')} / ${s.total_due.toLocaleString('fr-FR')} - reste : ${(s.total_due - s.paid).toLocaleString('fr-FR')} FCFA`);
  });
  doc.end();
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'report.exported_unpaid', ip: req.ip });
});

// --- Bascule d'année scolaire (admin/directrice) avec aperçu de ce qui sera fait ---
router.get('/year/advance/preview', requireRole('director', 'admin'), (req, res) => {
  res.json(getYearAdvanceStatus(req.user.school_id, { preview: true }));
});

router.post('/year/advance', requireRole('director', 'admin'), (req, res) => {
  const result = advanceToNextYear(req.user.school_id, req.user, req.ip);
  if (result.error) return res.status(400).json(result);
  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'year.advanced', details: result.summary, ip: req.ip });
  res.json(result);
});

export default router;
