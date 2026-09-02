import { prepare as db } from '../db/database.js';

/**
 * Journalise toute action sensible dans audit_logs.
 * Ne jamais throw : un échec d'audit ne doit pas casser la requête.
 */
export function logAudit({ schoolId = null, userId = null, userName = null, action, entityType = null, entityId = null, details = null, ip = null }) {
  try {
    db(
      `INSERT INTO audit_logs (school_id, user_id, user_name, action, entity_type, entity_id, details, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(schoolId, userId, userName, action, entityType, entityId, details ? JSON.stringify(details) : null, ip);
  } catch (err) {
    console.error('[audit] échec du log:', err.message);
  }
}
