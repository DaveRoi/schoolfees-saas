import fs from 'node:fs';
import path from 'node:path';

/** Sauvegardes automatiques : copie horodatée de la base, rétention limitée. */
const RETENTION_DAYS = 30;
let scheduled = false;

export function backupNow(dbPath, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(backupDir, `school-${stamp}.db`);
  fs.copyFileSync(dbPath, dest);
  // Réplication WAL pour une copie cohérente si la base est ouverte
  for (const ext of ['-wal', '-shm']) {
    const src = dbPath + ext;
    if (fs.existsSync(src)) fs.copyFileSync(src, dest + ext);
  }
  cleanOld(backupDir);
  console.log(`[backup] Sauvegarde créée : ${dest}`);
  return dest;
}

function cleanOld(backupDir) {
  if (!fs.existsSync(backupDir)) return;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 3600 * 1000;
  for (const f of fs.readdirSync(backupDir)) {
    const full = path.join(backupDir, f);
    if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
  }
}

/** Une sauvegarde par jour, au premier démarrage du jour. */
export function scheduleDaily(dbPath, backupDir) {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const already = fs.existsSync(backupDir) && fs.readdirSync(backupDir).some((f) => f.includes(today));
      if (!already) backupNow(dbPath, backupDir);
    } catch (err) {
      console.error('[backup] échec:', err.message);
    }
  };
  run();
  setInterval(run, 6 * 3600 * 1000).unref();
}
