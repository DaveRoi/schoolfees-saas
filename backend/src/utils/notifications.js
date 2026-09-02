import { prepare as db } from '../db/database.js';
import { logAudit } from '../utils/audit.js';

/**
 * Enregistre et "envoie" une notification (SMS/WhatsApp simulés).
 * En production : brancher ici Africa's Talking (SMS) et WhatsApp Business API.
 * schoolId est propagé pour l'isolation multi-écoles.
 */
export function sendNotification({ schoolId = null, channel, phone, recipientName, message, purpose = 'transaction', paymentId = null }) {
  if (!['sms', 'whatsapp'].includes(channel)) throw new Error('Canal invalide');
  const info = db(
    `INSERT INTO notifications (school_id, channel, recipient_phone, recipient_name, message, purpose, status, related_payment_id)
     VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)`
  ).run(schoolId, channel, phone, recipientName, message, purpose, paymentId);
  console.log(`[notif:${channel}] -> ${phone} : ${message}`);
  return info.lastInsertRowid;
}

/** Notifie le parent + la directrice + la coordinatrice après un paiement. */
export function notifyPaymentSuccess(payment, student, parent) {
  const amount = payment.amount.toLocaleString('fr-FR');
  const msgParent =
    `Paiement reçu : ${amount} FCFA pour ${student.first_name} ${student.last_name}. ` +
    `Ref : ${payment.provider_ref}. Solde mis à jour en temps réel. Merci !`;
  const msgStaff =
    `Encaissement : ${amount} FCFA par ${parent.full_name} pour ${student.first_name} ${student.last_name} ` +
    `(${payment.method === 'mtn_momo' ? 'MTN MoMo' : payment.method === 'orange_money' ? 'Orange Money' : 'Cash'}). Ref : ${payment.provider_ref}.`;

  if (parent?.phone) {
    sendNotification({ schoolId: payment.school_id, channel: 'sms', phone: parent.phone, recipientName: parent.full_name, message: msgParent, paymentId: payment.id });
    sendNotification({ schoolId: payment.school_id, channel: 'whatsapp', phone: parent.phone, recipientName: parent.full_name, message: msgParent, paymentId: payment.id });
  }

  for (const role of ['director', 'coordinator']) {
    const staff = db(`SELECT * FROM users WHERE role = ? AND school_id = ?`).get(role, payment.school_id);
    if (staff && staff.phone) {
      sendNotification({ schoolId: payment.school_id, channel: 'sms', phone: staff.phone, recipientName: staff.full_name, message: msgStaff, paymentId: payment.id });
      sendNotification({ schoolId: payment.school_id, channel: 'whatsapp', phone: staff.phone, recipientName: staff.full_name, message: msgStaff, paymentId: payment.id });
    }
  }
  logAudit({ schoolId: payment.school_id, action: 'notifications.sent', entityType: 'payment', entityId: payment.id, details: { to: 'parent+staff' } });
}
