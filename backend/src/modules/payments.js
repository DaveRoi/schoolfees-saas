import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prepare as db, transaction } from '../db/database.js';
import { requireAuth, requireRole, loadOwnedStudents, canAccessStudent } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { logAudit } from '../utils/audit.js';
import { initiatePayment, checkStatus } from '../utils/mobileMoney.js';
import { notifyPaymentSuccess } from '../utils/notifications.js';
import { studentBalance } from './students.js';

const router = Router();
router.use(requireAuth, loadOwnedStudents);

// --- Lister mes paiements (parent) / tous les paiements (staff) ---
router.get('/', (req, res) => {
  if (req.user.role === 'parent') {
    const payments = db
      (
        `SELECT p.*, s.first_name, s.last_name, fi.label AS fee_label
         FROM payments p
         JOIN students s ON s.id = p.student_id
         LEFT JOIN fee_items fi ON fi.id = p.fee_item_id
         WHERE p.parent_id = ? ORDER BY p.created_at DESC`
      )
      .all(req.user.id);
    return res.json({ payments });
  }
  const payments = db
    (
      `SELECT p.*, s.first_name, s.last_name, c.name AS class_name, u.full_name AS parent_name, fi.label AS fee_label
       FROM payments p
       JOIN students s ON s.id = p.student_id
       JOIN classes c ON c.id = s.class_id
       JOIN users u ON u.id = p.parent_id
       LEFT JOIN fee_items fi ON fi.id = p.fee_item_id
       WHERE p.school_id = ?
       ORDER BY p.created_at DESC LIMIT 500`
    )
    .all(req.user.school_id);
  res.json({ payments });
});

// --- Détail d'un paiement (isolation parent appliquée) ---
router.get('/:id(\\d+)', (req, res) => {
  const p = db(`SELECT * FROM payments WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!p) return res.status(404).json({ error: 'Paiement introuvable.' });
  if (req.user.role === 'parent' && p.parent_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé.' });
  res.json({ payment: p });
});

// --- INITIER un paiement (parent uniquement, pour son enfant uniquement) ---
router.post('/initiate', (req, res) => {
  if (req.user.role !== 'parent') return res.status(403).json({ error: 'Seuls les parents effectuent des paiements en ligne.' });

  const errors = validate(
    {
      student_id: { required: true, type: 'number' },
      fee_item_id: { required: true, type: 'number' },
      amount: { required: true, type: 'number' },
      method: { required: true, enum: ['mtn_momo', 'orange_money'] },
      phone: { required: true, pattern: /^\+?6\d{8}$/ },
    },
    req.body
  );
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const studentId = Number(req.body.student_id);
  if (!canAccessStudent(req, studentId)) return res.status(403).json({ error: 'Accès refusé : cet élève n\'est pas rattaché à votre compte.' });

  const student = db(`SELECT * FROM students WHERE id = ? AND school_id = ? AND status = 'active'`).get(studentId, req.user.school_id);
  if (!student) return res.status(404).json({ error: 'Élève introuvable ou inactif.' });
  const fee = db(`SELECT * FROM fee_items WHERE id = ? AND class_id = ?`).get(Number(req.body.fee_item_id), student.class_id);
  if (!fee) return res.status(404).json({ error: 'Échéance introuvable pour cet élève.' });

  // Un seul paiement pending actif par (élève, échéance) : évite les doubles demandes
  const pending = db(
    `SELECT COUNT(*) AS c FROM payments WHERE student_id = ? AND fee_item_id = ? AND status = 'pending' AND created_at > datetime('now', '-15 minutes')`
  ).get(studentId, fee.id);
  if (pending.c > 0) return res.status(409).json({ error: 'Un paiement est déjà en cours pour cette échéance. Validez-le sur votre téléphone ou patientez quelques minutes.' });

  const bal = studentBalance(studentId);
  const amount = Math.round(Number(req.body.amount));
  if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
  if (amount > bal.balance) return res.status(400).json({ error: `Montant supérieur au solde restant (${bal.balance.toLocaleString('fr-FR')} FCFA).` });

  const { providerRef, ussdPrompt } = initiatePayment({ method: req.body.method, phone: req.body.phone, amount, reference: `FEE-${fee.id}-${studentId}` });
  const info = db
    (
      `INSERT INTO payments (school_id, student_id, parent_id, fee_item_id, amount, method, provider_ref, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(req.user.school_id, studentId, req.user.id, fee.id, amount, req.body.method, providerRef, req.body.note || null);

  logAudit({ schoolId: req.user.school_id, userId: req.user.id, userName: req.user.full_name, action: 'payment.initiated', entityType: 'payment', entityId: info.lastInsertRowid, details: { amount, method: req.body.method, studentId }, ip: req.ip });
  res.status(201).json({ paymentId: info.lastInsertRowid, providerRef, ussdPrompt, message: 'Demande envoyée sur votre téléphone. Validez avec votre code secret.' });
});

// --- CONFIRMER un paiement (simule la validation USSD côté client) ---
router.post('/:id(\\d+)/confirm', (req, res) => {
  const payment = db(`SELECT * FROM payments WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });
  if (req.user.role === 'parent' && payment.parent_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé.' });
  if (payment.status !== 'pending') return res.status(409).json({ error: `Ce paiement est déjà ${payment.status === 'expired' ? 'expiré' : payment.status}.` });

  const result = checkStatus({ providerRef: payment.provider_ref, method: payment.method });
  let status = result.status;

  // PROTECTION SURENCAISSEMENT : même à la confirmation, on revérifie le solde réel.
  // Si un autre tuteur a payé entre-temps, on plafonne ou on refuse.
  const bal = studentBalance(payment.student_id);
  if (status === 'success' && payment.amount > bal.balance) {
    status = 'failed';
    logAudit({ schoolId: payment.school_id, userId: req.user.id, userName: req.user.full_name, action: 'payment.overpayment_blocked', entityType: 'payment', entityId: payment.id, details: { attempted: payment.amount, remaining: bal.balance }, ip: req.ip });
    db(`UPDATE payments SET status = 'failed', note = COALESCE(note,'') || 'Bloqué : solde déjà couvert par un autre paiement.' WHERE id = ?`).run(payment.id);
    return res.status(409).json({
      payment: { ...payment, status: 'failed' },
      message: `Ce paiement n'est plus nécessaire : le solde restant est de ${bal.balance.toLocaleString('fr-FR')} FCFA. Le paiement a été annulé, vous n'êtes pas débité.`,
    });
  }

  db(`UPDATE payments SET status = ?, paid_at = CASE WHEN ? = 'success' THEN datetime('now') ELSE paid_at END WHERE id = ? AND status = 'pending'`).run(status, status, payment.id);
  const updated = db(`SELECT * FROM payments WHERE id = ?`).get(payment.id);
  if (updated.status === 'pending') {
    // Concurrence : confirmé/expiré par une autre requête entre-temps
    return res.status(409).json({ payment: updated, message: 'Ce paiement a déjà été traité.' });
  }

  logAudit({ schoolId: payment.school_id, userId: req.user.id, userName: req.user.full_name, action: `payment.${status}`, entityType: 'payment', entityId: payment.id, details: { amount: payment.amount, providerRef: payment.provider_ref }, ip: req.ip });

  if (status === 'success') {
    const student = db(`SELECT * FROM students WHERE id = ?`).get(payment.student_id);
    const parent = db(`SELECT * FROM users WHERE id = ?`).get(payment.parent_id);
    notifyPaymentSuccess(updated, student, parent);
    const newBal = studentBalance(payment.student_id);
    return res.json({ payment: updated, newBalance: newBal, message: 'Paiement réussi ! Solde mis à jour et notifications envoyées.' });
  }
  res.status(402).json({ payment: updated, message: result.reason || 'Paiement refusé par l\'opérateur.' });
});

// --- Annuler un paiement pending (le parent peut annuler sa demande) ---
router.post('/:id(\\d+)/cancel', (req, res) => {
  const payment = db(`SELECT * FROM payments WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });
  if (req.user.role === 'parent' && payment.parent_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé.' });
  if (payment.status !== 'pending') return res.status(409).json({ error: `Ce paiement est déjà ${payment.status}.` });

  db(`UPDATE payments SET status = 'cancelled' WHERE id = ? AND status = 'pending'`).run(payment.id);
  logAudit({ schoolId: payment.school_id, userId: req.user.id, userName: req.user.full_name, action: 'payment.cancelled', entityType: 'payment', entityId: payment.id, ip: req.ip });
  res.json({ message: 'Paiement annulé.' });
});

// --- Remboursement (admin/directrice) ---
router.post('/:id(\\d+)/refund', requireRole('director', 'admin'), (req, res) => {
  const payment = db(`SELECT * FROM payments WHERE id = ? AND school_id = ?`).get(Number(req.params.id), req.user.school_id);
  if (!payment || payment.status !== 'success') return res.status(400).json({ error: 'Seul un paiement réussi peut être remboursé.' });
  const amount = Math.round(Number(req.body.amount));
  if (!amount || amount <= 0 || amount > payment.amount) return res.status(400).json({ error: 'Montant de remboursement invalide.' });

  transaction(() => {
    db(`UPDATE payments SET status = 'refunded' WHERE id = ?`).run(payment.id);
    db(`INSERT INTO refunds (payment_id, amount, reason, processed_by) VALUES (?, ?, ?, ?)`).run(payment.id, amount, req.body.reason || null, req.user.id);
  });
  logAudit({ schoolId: payment.school_id, userId: req.user.id, userName: req.user.full_name, action: 'payment.refunded', entityType: 'payment', entityId: payment.id, details: { amount, reason: req.body.reason }, ip: req.ip });
  res.json({ message: 'Remboursement enregistré.' });
});

// --- Reçu PDF d'un paiement ---
router.get('/:id(\\d+)/receipt', (req, res) => {
  const p = db
    (
      `SELECT p.*, s.first_name, s.last_name, u.full_name AS parent_name, c.name AS class_name, fi.label AS fee_label, sc.name AS school_name, sc.city AS school_city
       FROM payments p
       JOIN students s ON s.id = p.student_id
       JOIN users u ON u.id = p.parent_id
       JOIN classes c ON c.id = s.class_id
       JOIN schools sc ON sc.id = p.school_id
       LEFT JOIN fee_items fi ON fi.id = p.fee_item_id
       WHERE p.id = ? AND p.school_id = ?`
    )
    .get(Number(req.params.id), req.user.school_id);
  if (!p) return res.status(404).json({ error: 'Paiement introuvable.' });
  if (req.user.role === 'parent' && p.parent_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé.' });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recu-${p.id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(22).fillColor('#1e3a5f').text('REÇU DE PAIEMENT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`${p.school_name} - ${p.school_city || ''} - Année ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, { align: 'center' });
  doc.moveDown(1.5);

  const rows = [
    ['N° Reçu', `REC-${String(p.id).padStart(5, '0')}`],
    ['Date et heure', p.paid_at || p.created_at],
    ['Élève', `${p.first_name} ${p.last_name}`],
    ['Classe', p.class_name],
    ['Payé par', p.parent_name],
    ['Échéance', p.fee_label || '-'],
    ['Montant', `${p.amount.toLocaleString('fr-FR')} FCFA`],
    ['Moyen', p.method === 'mtn_momo' ? 'MTN Mobile Money' : p.method === 'orange_money' ? 'Orange Money' : 'Espèces'],
    ['Réf. opérateur', p.provider_ref || '-'],
    ['Statut', p.status === 'success' ? 'PAYÉ' : p.status.toUpperCase()],
  ];
  rows.forEach(([k, v]) => {
    doc.fontSize(11).fillColor('#333').text(`${k} :`, 70, doc.y, { continued: true });
    doc.fillColor('#000').text(`  ${v}`);
  });
  doc.moveDown(1);
  doc.fontSize(9).fillColor('#888').text('Reçu généré électroniquement — EduPay Cameroun', { align: 'center' });
  doc.end();
});

export default router;
