import { Router } from 'express';
import { prepare as db } from '../db/database.js';

const router = Router();

/**
 * Vérification PUBLIQUE d'un reçu (aucune authentification requise).
 * Permet à quiconque (parent, école, administrateur) de vérifier
 * l'authenticité d'une quittance EduPay à partir de son numéro REC-XXXXX.
 * Ne divulgue que le strict nécessaire (anti-énumération).
 */
router.get('/verify/:receiptNumber', (req, res) => {
  const number = String(req.params.receiptNumber || '').trim().toUpperCase();
  const m = number.match(/^REC-(\d+)$/);
  if (!m) return res.status(400).json({ error: 'Format attendu : REC-00001' });

  const p = db(
    `SELECT p.id, p.amount, p.status, p.method, p.paid_at, s.first_name, s.last_name, c.name AS class_name, sc.name AS school_name
     FROM payments p
     JOIN students s ON s.id = p.student_id
     JOIN classes c ON c.id = s.class_id
     JOIN schools sc ON sc.id = p.school_id
     WHERE p.id = ?`
  ).get(Number(m[1]));

  if (!p || p.status !== 'success') {
    return res.status(404).json({ valid: false, error: 'Aucun paiement valide trouvé pour ce numéro de reçu.' });
  }

  res.json({
    valid: true,
    receipt: {
      number: `REC-${String(p.id).padStart(5, '0')}`,
      school: p.school_name,
      student: `${p.first_name} ${p.last_name}`,
      class: p.class_name,
      amount: p.amount,
      method: p.method === 'mtn_momo' ? 'MTN Mobile Money' : p.method === 'orange_money' ? 'Orange Money' : 'Espèces',
      paid_at: p.paid_at,
      status: p.status,
    },
  });
});

export default router;
