# 🎓 SchoolFees SaaS — Gestion des pensions scolaires (Cameroun)

Application complète de gestion et de paiement des pensions scolaires : les parents paient à distance via Mobile Money (MTN / Orange), le staff gère élèves et comptabilité en temps réel.

## Démarrage rapide

```bash
# 1. Backend (port 4000)
cd backend
npm install
npm run seed        # crée la base de démo (une seule fois)
npm run dev

# 2. Frontend (port 5173) — dans un autre terminal
cd frontend
npm install
npm run dev
```

Ouvrez **http://localhost:5173**

### Comptes de démonstration (mot de passe : `Password123`)

| Rôle | Email | Accès |
|---|---|---|
| Administrateur | `admin@school.cm` | Tout : utilisateurs, classes, frais |
| Coordinatrice | `coord@school.cm` | Élèves : ajout, modification, rattachement parents |
| Directrice | `directrice@school.cm` | Paiements, tableaux de bord, rapports, audit, remboursements |
| Parent (3 enfants) | `parent1@parent.cm` | Ses enfants uniquement, paiement MoMo |
| Parent (2 enfants) | `parent2@parent.cm` | Idem |
| Parent (1 enfant) | `parent3@parent.cm` | Idem |

## Fonctionnalités implémentées

- **4 rôles** avec accès strictement cloisonné (admin, coordinatrice, directrice, parent)
- **Isolation des données** : un parent ne voit QUE ses enfants — vérifiée au niveau de l'API (tests inclus)
- **Paiement Mobile Money simulé** (MTN MoMo / Orange Money) : initiation → validation USSD → confirmation (95% succès simulé, 5% d'échecs pour tester la robustesse)
- **Paiement total ou partiel**, montant plafonné au solde restant
- **Notifications SMS + WhatsApp** (simulées, journalisées) au parent + à la directrice + à la coordinatrice après chaque paiement
- **Reçus PDF** téléchargeables par paiement
- **Tableau de bord temps réel** (actualisation 15 s) : graphiques (14 jours, par classe), impayés, derniers paiements
- **Exports CSV** (encaissements filtrables par période) et **PDF de clôture mensuelle**
- **Rapports d'audit** : qui a fait quoi, quand, depuis quelle IP
- **MFA (TOTP)** activable depuis la page profil (Google Authenticator / FreeOTP)
- **RGPD** : consentement à l'inscription, anonymisation des comptes (droit à l'effacement)
- **Multi-enfants / multi-tuteurs** : un parent peut avoir plusieurs enfants, un enfant plusieurs tuteurs (parents séparés)
- **Remboursements** (directrice/admin) avec traçabilité

## Structure du code

```
backend/
  src/
    server.js            # Point d'entrée Express (helmet, CORS, rate limit)
    db/database.js       # SQLite (sql.js) + schéma + wrapper simple
    db/seed.js           # Données de démonstration
    middleware/auth.js   # requireAuth, requireRole, isolation parent
    modules/auth.js      # Inscription, login, MFA, refresh
    modules/students.js  # Élèves, balance, rattachement parents
    modules/payments.js  # Initiation/confirmation MoMo, reçus PDF, remboursements
    modules/reports.js   # Dashboard, exports CSV/PDF, audit, notifications
    modules/admin.js     # Classes, échéances, utilisateurs, RGPD
    utils/mobileMoney.js # Simulation MTN/Orange (à remplacer par les vraies API)
    utils/notifications.js
    utils/audit.js
  test-api.mjs          # 17 tests de bout en bout (node test-api.mjs)

frontend/
  src/
    App.jsx              # Routage par rôle
    components/          # Layout, AuthContext
    pages/parent/        # Mes enfants, détail, paiement, historique
    pages/staff/         # Dashboard graphique, élèves, paiements, rapports
    pages/admin/         # Utilisateurs, classes & frais
```

## Passer en production

- **Mobile Money réel** : remplacer les fonctions dans `backend/src/utils/mobileMoney.js` par les API [MTN MoMo Collections](https://momodeveloper.mtn.com) et [Orange Money Web Payment](https://developer.orange.com). Le flow (initiate → confirm) est déjà calqué sur le réel.
- **SMS/WhatsApp réels** : brancher `sendNotification()` (backend/src/utils/notifications.js) sur Africa's Talking (SMS) et WhatsApp Business API.
- **Sécurité** : définir `JWT_SECRET` et `REFRESH_SECRET` forts dans `backend/.env` (voir `.env.example`), servir en HTTPS.
- **Base de données** : sql.js est parfait pour démarrer ; pour de gros volumes, migrer vers PostgreSQL (le schéma est standard).
- ** RGPD** : l'anonymisation est en place ; adapter la politique de conservation à votre établissement.

## Tests

```bash
cd backend
npm run seed        # si besoin de réinitialiser (supprimer backend/data/school.db)
node test-api.mjs   # 17 tests : isolation, paiements, notifications, exports, MFA…
```
