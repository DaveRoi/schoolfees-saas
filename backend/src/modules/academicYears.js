import { prepare as db, transaction } from '../db/database.js';
import { logAudit } from '../utils/audit.js';

/**
 * GESTION INTELLIGENTE DES ANNÉES SCOLAIRES.
 *
 * Principe : chaque année a ses classes, ses échéances et ses paiements.
 * La bascule d'année (ex: 2025-2026 -> 2026-2027) :
 *   1. Clôture l'ancienne année (lecture seule, conservée pour l'historique)
 *   2. Crée la nouvelle année avec les mêmes classes (noms, niveaux, frais paramétrables)
 *   3. Duplique les échéances (l'admin peut ajuster avant la rentrée)
 *   4. Promeut les élèves actifs vers la classe supérieure :
 *      - classe suivante connue (next_class_id) -> promotion
 *      - classe terminale (is_terminal) -> statut 'graduated'
 *   5. Les élèves 'transferred'/'removed' ne sont pas recopiés
 *   6. Les impayés de l'ancienne année NE SONT PAS reportés automatiquement :
 *      l'école décide (rapport d'impayés exportable avant la bascule)
 *
 * Détection automatique : getYearAdvanceStatus() signale quand l'année
 * courante approche de sa fin (paramétrable : auto_advance_days).
 */

export function getCurrentYear(schoolId) {
  return db(`SELECT * FROM academic_years WHERE school_id = ? AND is_current = 1`).get(schoolId);
}

export function getYears(schoolId) {
  return db(`SELECT * FROM academic_years WHERE school_id = ? ORDER BY start_date DESC`).all(schoolId);
}

/** Génère le label de l'année suivante : '2025-2026' -> '2026-2027'. */
export function nextYearLabel(label) {
  const [a, b] = label.split('-').map(Number);
  return `${b}-${b + 1}`;
}

/** État d'avancement de l'année : l'école doit-elle basculer ? */
export function getYearAdvanceStatus(schoolId, { preview = false } = {}) {
  const year = getCurrentYear(schoolId);
  if (!year) return { error: 'Aucune année scolaire courante.' };

  const settings = db(`SELECT auto_advance_days FROM settings WHERE school_id = ?`).get(schoolId) || { auto_advance_days: 30 };
  const daysLeft = Math.ceil((new Date(year.end_date) - Date.now()) / 86400000);

  const status = {
    year,
    daysLeft,
    shouldAdvance: daysLeft <= (settings.auto_advance_days || 30),
    nextLabel: nextYearLabel(year.label),
    nextYearExists: !!db(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`).get(schoolId, nextYearLabel(year.label)),
  };

  if (preview) {
    const classes = db(
      `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status='active') AS students,
              nc.name AS next_class_name, nc.id AS real_next_class_id
       FROM classes c LEFT JOIN classes nc ON nc.id = c.next_class_id
       WHERE c.academic_year_id = ? ORDER BY c.name`
    ).all(year.id);
    status.preview = {
      classes: classes.map((c) => ({
        name: c.name,
        level: c.level,
        students: c.students,
        is_terminal: !!c.is_terminal,
        promotesTo: c.is_terminal ? null : c.next_class_name || c.name.replace(/^(6e|5e|4e|3e|2nde|1re)/, (m) => nextGrade(m)),
      })),
      graduates: classes.filter((c) => c.is_terminal).reduce((s, c) => s + c.students, 0),
      notCarried: ['transferred', 'removed'].length,
    };
  }
  return status;
}

function nextGrade(grade) {
  const map = { '6e': '5e', '5e': '4e', '4e': '3e', '3e': '2nde', '2nde': '1re', '1re': 'Tle' };
  return map[grade.replace(/^(\d+e|2nde|1re|Tle)$/, '$1')] || grade;
}

/**
 * Exécute la bascule. Toutes les classes de l'ancienne année sont recréées
 * dans la nouvelle (mêmes frais, ajustables ensuite), avec leur chaîne de
 * promotion (next_class_id) qui pointe vers les NOUVELLES classes.
 */
export function advanceToNextYear(schoolId, user, ip) {
  const current = getCurrentYear(schoolId);
  if (!current) return { error: 'Aucune année courante.' };
  if (current.is_closed) return { error: `L'année ${current.label} est déjà clôturée.` };

  const nextLabel = nextYearLabel(current.label);
  const exists = db(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`).get(schoolId, nextLabel);
  if (exists) return { error: `L'année ${nextLabel} existe déjà. Passez-la en année courante depuis l'admin.` };

  const [y1, y2] = current.label.split('-').map(Number);
  const startDate = `${y2}-09-01`;
  const endDate = `${y2 + 1}-07-15`;

  const result = transaction(() => {
    // D'abord retirer le flag courant de l'ancienne année, PUIS créer la nouvelle
    db(`UPDATE academic_years SET is_current = 0 WHERE school_id = ? AND is_current = 1`).run(schoolId);
    const newYearId = db
      (`INSERT INTO academic_years (school_id, label, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 1)`)
      .run(schoolId, nextLabel, startDate, endDate).lastInsertRowid;

    // Recréer les classes de la nouvelle année (copie de structure + frais)
    const oldClasses = db(`SELECT * FROM classes WHERE academic_year_id = ? ORDER BY name`).all(current.id);
    const newClassIds = {};
    for (const c of oldClasses) {
      newClassIds[c.id] = db
        (
          `INSERT INTO classes (school_id, name, level, academic_year_id, annual_fee, is_terminal)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(schoolId, c.name, c.level, newYearId, c.annual_fee, c.is_terminal).lastInsertRowid;
    }

    // Chaîne de promotion : next_class_id de la nouvelle classe = nouvelle classe suivante
    for (const c of oldClasses) {
      if (c.next_class_id && newClassIds[c.next_class_id]) {
        db(`UPDATE classes SET next_class_id = ? WHERE id = ?`).run(newClassIds[c.next_class_id], newClassIds[c.id]);
      }
    }

    // Dupliquer les échéances avec les mêmes montants (ajustables avant la rentrée)
    const fees = db(`SELECT * FROM fee_items WHERE academic_year_id = ?`).all(current.id);
    for (const fi of fees) {
      db(
        `INSERT INTO fee_items (school_id, class_id, academic_year_id, label, amount, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(schoolId, newClassIds[fi.class_id], newYearId, fi.label, fi.amount, shiftDueDate(fi.due_date, 1));
    }

    // Promouvoir les élèves actifs
    let promoted = 0;
    let graduated = 0;
    let kept = 0;
    const activeStudents = db(`SELECT * FROM students WHERE school_id = ? AND status = 'active'`).all(schoolId);
    for (const s of activeStudents) {
      const cls = oldClasses.find((c) => c.id === s.class_id);
      if (!cls) { kept++; continue; }
      if (cls.is_terminal) {
        db(`UPDATE students SET status = 'graduated', updated_at = datetime('now') WHERE id = ?`).run(s.id);
        graduated++;
      } else {
        const target = cls.next_class_id && newClassIds[cls.next_class_id] ? newClassIds[cls.next_class_id] : null;
        if (target) {
          db(`UPDATE students SET class_id = ?, updated_at = datetime('now') WHERE id = ?`).run(target, s.id);
          promoted++;
        } else {
          kept++; // pas de classe suivante définie : reste dans la même "nouvelle" classe équivalente
          db(`UPDATE students SET class_id = ?, updated_at = datetime('now') WHERE id = ?`).run(newClassIds[cls.id], s.id);
        }
      }
    }

    // Clôturer l'ancienne année
    db(`UPDATE academic_years SET is_closed = 1, closed_at = datetime('now'), closed_by = ? WHERE id = ?`).run(user.id, current.id);

    return { promoted, graduated, kept };
  });

  logAudit({
    schoolId,
    userId: user.id,
    userName: user.full_name,
    action: 'year.advanced',
    details: { from: current.label, to: nextLabel, promoted: result.promoted, graduated: result.graduated },
    ip,
  });

  return {
    message: `Année ${nextLabel} créée. ${result.promoted} élève(s) promu(s), ${result.graduated} diplômé(s), ${result.kept} maintenu(s). Ajustez les frais si besoin avant la rentrée.`,
    summary: { newYear: nextLabel, ...result },
  };
}

/** Décale une date d'échéance de n années (2025-09-10 -> 2026-09-10). */
function shiftDueDate(dateStr, years) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}
