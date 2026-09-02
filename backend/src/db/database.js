import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scheduleDaily as scheduleDailyBackup } from '../utils/backup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'school.db');

fs.mkdirSync(DB_DIR, { recursive: true });

/** SQLite natif (better-sqlite3) : WAL activé = résistant aux crash,
 *  écritures synchrones = aucune perte de transaction validée. */
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  code TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  label TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  is_closed INTEGER NOT NULL DEFAULT 0,
  closed_at TEXT,
  closed_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(school_id, label)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','coordinator','director','parent')),
  mfa_secret TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  next_class_id INTEGER REFERENCES classes(id),
  annual_fee INTEGER NOT NULL,
  is_terminal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(school_id, name, academic_year_id)
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT CHECK(gender IN ('M','F')),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  father_name TEXT,
  mother_name TEXT,
  guardian_phone TEXT,
  guardian_phone_2 TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','transferred','graduated','removed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parent_students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'tuteur',
  UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS fee_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  parent_id INTEGER NOT NULL REFERENCES users(id),
  fee_item_id INTEGER REFERENCES fee_items(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL CHECK(method IN ('mtn_momo','orange_money','cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','refunded','cancelled','expired')),
  provider_ref TEXT,
  paid_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  reason TEXT,
  processed_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER REFERENCES schools(id),
  channel TEXT NOT NULL CHECK(channel IN ('sms','whatsapp')),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'transaction',
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('queued','sent','failed')),
  related_payment_id INTEGER REFERENCES payments(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER REFERENCES schools(id),
  user_id INTEGER REFERENCES users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  school_id INTEGER PRIMARY KEY REFERENCES schools(id),
  pending_expiry_minutes INTEGER NOT NULL DEFAULT 15,
  reminder_days INTEGER NOT NULL DEFAULT 7,
  auto_advance_days INTEGER NOT NULL DEFAULT 30,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_ps_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_ps_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_items_class ON fee_items(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_items_year ON fee_items(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
`);

/** Wrapper API simple et synchrone. */
export function prepare(sql) {
  const stmt = db.prepare(sql);
  return {
    get: (...params) => stmt.get(...params),
    all: (...params) => stmt.all(...params),
    run: (...params) => stmt.run(...params),
  };
}

/** Exécute fn de façon atomique (tout ou rien). Usage : transaction(() => { ... }) */
export function transaction(fn) {
  return db.transaction(fn)();
}

/** Maintenance automatique : expiration des paiements pending + purge des sessions
 *  révoquées. Appelée de façon planifiée par le serveur. */
export function runMaintenance() {
  const settings = db.prepare(`SELECT school_id AS sid, pending_expiry_minutes AS minutes FROM settings`).all();
  for (const s of settings) {
    const minutes = s.minutes || 15;
    const r = db
      .prepare(
        `UPDATE payments SET status = 'expired'
         WHERE school_id = ? AND status = 'pending'
           AND created_at < datetime('now', ?)`
      )
      .run(s.sid, `-${minutes} minutes`);
    if (r.changes > 0) {
      console.log(`[maintenance] ${r.changes} paiement(s) pending expiré(s) (école ${s.sid}).`);
    }
  }
  const purged = db
    .prepare(`DELETE FROM sessions WHERE (expires_at < datetime('now', '-30 days')) OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-30 days'))`)
    .run();
  if (purged.changes > 0) console.log(`[maintenance] ${purged.changes} vieille(s) session(s) purgée(s).`);
}

// Sauvegarde quotidienne planifiée
scheduleDailyBackup(DB_PATH, path.join(DB_DIR, 'backups'));

export default { db, persist: () => {}, prepare, transaction, runMaintenance };
