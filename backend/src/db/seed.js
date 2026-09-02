import bcrypt from 'bcryptjs';
import { prepare as db } from './database.js';

/**
 * Données de démonstration : 1 école, année scolaire, 4 classes avec chaîne de promotion,
 * 3 staff + 4 parents + 8 élèves + échéances + paiements.
 * Comptes (mot de passe pour tous : Password123)
 *   admin@school.cm        (Administrateur)
 *   coord@school.cm        (Coordinatrice)
 *   directrice@school.cm   (Directrice)
 *   parent1@parent.cm      (3 enfants)
 *   parent2@parent.cm      (2 enfants)
 *   parent3@parent.cm      (1 enfant)
 *   parent4@parent.cm      (tutrice partagée)
 * Code école pour l'inscription : DEMO2025
 */
export function seed() {
  const count = db(`SELECT COUNT(*) AS c FROM users`).get().c;
  if (count > 0) {
    console.log('Base déjà initialisée — seed ignoré (supprimez backend/data/school.db pour recommencer).');
    return;
  }

  const schoolId = db
    (
      `INSERT INTO schools (name, city, address, phone, email, code) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run('Groupe Scolaire Étoile', 'Yaoundé', 'Montée Jouvence, Yaoundé', '+237 677 000 000', 'contact@school.cm', 'DEMO2025').lastInsertRowid;

  db(`INSERT INTO settings (school_id, pending_expiry_minutes, reminder_days, auto_advance_days) VALUES (?, 15, 7, 30)`).run(schoolId);

  // Année scolaire courante : 2025-2026 (fin proche pour tester la bascule)
  const yearId = db
    (`INSERT INTO academic_years (school_id, label, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 1)`)
    .run(schoolId, '2025-2026', '2025-09-01', '2026-07-15').lastInsertRowid;

  const hash = bcrypt.hashSync('Password123', 10);
  const insertUser = db(`INSERT INTO users (school_id, email, password_hash, full_name, phone, role, consent_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`);

  const staff = [
    ['admin@school.cm', 'Adèle Ngo Bassong', '677000001', 'admin'],
    ['coord@school.cm', 'Sylvie Ebolo', '677000002', 'coordinator'],
    ['directrice@school.cm', 'Marthe Abena', '677000003', 'director'],
  ];
  for (const [email, name, phone, role] of staff) insertUser.run(schoolId, email, hash, name, phone, role);

  const parents = [
    ['parent1@parent.cm', 'Jean Atangana', '677100001'],
    ['parent2@parent.cm', 'Clarisse Fouda', '677100002'],
    ['parent3@parent.cm', 'Paul Mbarga', '677100003'],
  ];
  const parentIds = parents.map(([email, name, phone]) => insertUser.run(schoolId, email, hash, name, phone, 'parent').lastInsertRowid);

  // Classes avec chaîne de promotion : 6ème -> 5ème -> 4ème -> 3ème (terminale collège)
  const insertClass = db(
    `INSERT INTO classes (school_id, name, level, academic_year_id, annual_fee, is_terminal) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const c6 = insertClass.run(schoolId, '6ème A', 'Collège', yearId, 150000, 0).lastInsertRowid;
  const c5 = insertClass.run(schoolId, '5ème B', 'Collège', yearId, 160000, 0).lastInsertRowid;
  const c4 = insertClass.run(schoolId, '4ème A', 'Collège', yearId, 180000, 0).lastInsertRowid;
  const c3 = insertClass.run(schoolId, '3ème A', 'Collège', yearId, 200000, 1).lastInsertRowid;
  db(`UPDATE classes SET next_class_id = ? WHERE id = ?`).run(c5, c6);
  db(`UPDATE classes SET next_class_id = ? WHERE id = ?`).run(c4, c5);
  db(`UPDATE classes SET next_class_id = ? WHERE id = ?`).run(c3, c4);

  // Échéances : 3 tranches par classe (total = annual_fee)
  const insertFee = db(`INSERT INTO fee_items (school_id, class_id, academic_year_id, label, amount, due_date) VALUES (?, ?, ?, ?, ?, ?)`);
  const feeIds = {};
  for (const [key, classId, fee] of [['6ème A', c6, 150000], ['5ème B', c5, 160000], ['4ème A', c4, 180000], ['3ème A', c3, 200000]]) {
    const tranche = Math.round(fee / 3);
    feeIds[key] = [
      insertFee.run(schoolId, classId, yearId, 'Frais de rentrée', tranche, '2025-09-10').lastInsertRowid,
      insertFee.run(schoolId, classId, yearId, '2ème tranche', tranche, '2025-12-15').lastInsertRowid,
      insertFee.run(schoolId, classId, yearId, '3ème tranche', fee - 2 * tranche, '2026-05-30').lastInsertRowid,
    ];
  }

  const insertStudent = db(
    `INSERT INTO students (school_id, first_name, last_name, birth_date, gender, class_id, father_name, mother_name, guardian_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const link = db(`INSERT INTO parent_students (parent_id, student_id, relation) VALUES (?, ?, ?)`);

  // parent1 : 3 enfants (multi-enfants, classes différentes)
  const s1 = insertStudent.run(schoolId, 'Éric', 'Atangana', '2012-03-15', 'M', c6, 'Jean Atangana', 'Rosalie Ngo', '677100001').lastInsertRowid;
  const s2 = insertStudent.run(schoolId, 'Mireille', 'Atangana', '2010-08-22', 'F', c5, 'Jean Atangana', 'Rosalie Ngo', '677100001').lastInsertRowid;
  const s3 = insertStudent.run(schoolId, 'Boris', 'Atangana', '2008-11-05', 'M', c3, 'Jean Atangana', 'Rosalie Ngo', '677100001').lastInsertRowid;
  link.run(parentIds[0], s1, 'père'); link.run(parentIds[0], s2, 'père'); link.run(parentIds[0], s3, 'père');

  // parent2 : 2 enfants
  const s4 = insertStudent.run(schoolId, 'Sandrine', 'Fouda', '2011-05-30', 'F', c5, 'feu Antoine Fouda', 'Clarisse Fouda', '677100002').lastInsertRowid;
  const s5 = insertStudent.run(schoolId, 'Kevin', 'Fouda', '2009-02-18', 'M', c4, 'feu Antoine Fouda', 'Clarisse Fouda', '677100002').lastInsertRowid;
  link.run(parentIds[1], s4, 'mère'); link.run(parentIds[1], s5, 'mère');

  // parent3 : 1 enfant ; tuteur multiple : parent2 aussi rattachée (remariage)
  const s6 = insertStudent.run(schoolId, 'Yann', 'Mbarga', '2012-09-12', 'M', c6, 'Paul Mbarga', 'Estelle Manga', '677100003').lastInsertRowid;
  link.run(parentIds[2], s6, 'père');

  // parent4 : belle-mère de Yann (tutrice partagée)
  const parent4 = insertUser.run(schoolId, 'parent4@parent.cm', hash, 'Estelle Manga', '677100004', 'parent').lastInsertRowid;
  link.run(parent4, s6, 'belle-mère');

  // Paiements historiques (réussis)
  const insertPayment = db(
    `INSERT INTO payments (school_id, student_id, parent_id, fee_item_id, amount, method, provider_ref, status, paid_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'success', datetime('now', ?), datetime('now', ?))`
  );

  insertPayment.run(schoolId, s1, parentIds[0], feeIds['6ème A'][0], 50000, 'mtn_momo', 'MTN-DEMO001', '-30 days', '-30 days');
  insertPayment.run(schoolId, s2, parentIds[0], feeIds['5ème B'][0], 60000, 'orange_money', 'OM-DEMO002', '-25 days', '-25 days');
  insertPayment.run(schoolId, s3, parentIds[0], feeIds['3ème A'][0], 70000, 'mtn_momo', 'MTN-DEMO003', '-20 days', '-20 days');
  insertPayment.run(schoolId, s4, parentIds[1], feeIds['5ème B'][0], 55000, 'mtn_momo', 'MTN-DEMO004', '-15 days', '-15 days');
  insertPayment.run(schoolId, s5, parentIds[1], feeIds['4ème A'][0], 100000, 'orange_money', 'OM-DEMO005', '-10 days', '-10 days');
  insertPayment.run(schoolId, s6, parentIds[2], feeIds['6ème A'][0], 30000, 'mtn_momo', 'MTN-DEMO006', '-5 days', '-5 days');
  insertPayment.run(schoolId, s6, parentIds[2], feeIds['6ème A'][0], 20000, 'mtn_momo', 'MTN-DEMO007', '-2 days', '-2 days');
  insertPayment.run(schoolId, s1, parentIds[0], feeIds['6ème A'][1], 30000, 'mtn_momo', 'MTN-DEMO008', '-1 day', '-1 day');

  console.log('Seed terminé : 1 école (code DEMO2025), 4 classes avec promotion, 8 élèves, 12 échéances, 8 paiements.');
  console.log('Comptes démo (tous avec Password123) : admin@school.cm, coord@school.cm, directrice@school.cm, parent1@parent.cm ...');
}

seed();
