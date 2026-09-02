import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRouter from './modules/auth.js';
import studentsRouter from './modules/students.js';
import paymentsRouter from './modules/payments.js';
import reportsRouter from './modules/reports.js';
import adminRouter from './modules/admin.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { runMaintenance, prepare as db } from './db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('change-me')) {
  console.warn('[config] JWT_SECRET par défaut détecté — changez-le en production !');
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Accès public au code école (pour l'écran d'inscription : autocomplétion du nom)
app.get('/api/schools/by-code/:code', (req, res) => {
  const school = db(`SELECT id, name, city, active FROM schools WHERE UPPER(code) = ?`).get(String(req.params.code).toUpperCase().trim());
  if (!school) return res.status(404).json({ error: 'Code école inconnu.' });
  res.json({ school: { name: school.name, city: school.city, active: !!school.active } });
});

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

// --- Frontend buildé servi par le backend en production ---
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA : toutes les routes non-API renvoient index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }));
app.use((err, _req, res, _next) => {
  console.error('[server] erreur non gérée:', err);
  if (!res.headersSent) res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SchoolFees SaaS backend : http://localhost:${PORT}`));

// Maintenance planifiée : expiration des paiements pending, purge sessions
setInterval(() => {
  try {
    runMaintenance();
  } catch (err) {
    console.error('[maintenance] échec:', err.message);
  }
}, 60 * 1000).unref();

export default app;
