# PROMPT CORRIGÉ — À COPIER-COLLER DANS GOOGLE AI STUDIO

---

Développe une application **SaaS complète et 100% fonctionnelle** de **gestion des pensions scolaires** pour les établissements du Cameroun et d'Afrique francophone. Objectif : permettre aux parents de payer la scolarité à distance via Mobile Money, et aux établissements de gérer leur comptabilité en temps réel.

## 1. RÔLES ET ACCÈS (4 profils distincts)

1. **Administrateur** — Gestion générale : comptes utilisateurs, paramètres de l'établissement, classes, tarifs de scolarité, gestion des années scolaires.
2. **Coordinatrice** — Ajout et gestion des élèves : identité complète (nom, date de naissance, classe, nom du père, nom de la mère, contacts téléphoniques des parents), affectation des élèves aux comptes parents.
3. **Directrice** — Contrôle général des paiements : montants encaissés, impayés, soldes restants par élève/classe, tableau de bord comptable, validation de la clôture mensuelle.
4. **Parent** — Compte personnel sécurisé : consultation des pensions de TOUS ses enfants (un parent peut avoir plusieurs enfants), historique des paiements avec dates et heures exactes, solde restant total, paiement à distance.

## 2. PAIEMENTS

- Intégration des API **MTN Mobile Money** et **Orange Money Cameroun** (mode sandbox pour la démo, structure prête pour la production).
- Paiement **total ou partiel**, génération automatique d'un reçu numérique (PDF).
- Mise à jour **en temps réel** du solde de l'élève après chaque transaction.
- Gestion propre des échecs de paiement, annulations et tentatives répétées.

## 3. NOTIFICATIONS MULTI-CANAUX

- **SMS + WhatsApp** automatiques après chaque transaction, envoyés à 3 destinataires : le parent payeur, la Directrice et la Coordinatrice.
- Rappels programmés avant les échéances et pour les impayés.
- Utiliser une passerelle type Africa's Talking ou Infobip pour le SMS, et WhatsApp Business API. Simuler l'envoi en mode démo avec une file d'attente visible dans un journal.

## 4. INTERFACE COMPTABLE ET REPORTING

- Tableau de bord **temps réel** avec graphiques analytiques détaillés (encaissements par jour/semaine/mois, par classe, taux de recouvrement).
- Rapports exportables en **PDF et CSV** pour la clôture mensuelle des comptes.
- **Rapports d'audit** accessibles en un clic : qui a fait quoi et quand (traçabilité complète).
- Liste en direct : qui a payé, qui n'a pas encore réglé, montants attendus vs encaissés.

## 5. SÉCURITÉ (exigences strictes)

- **Authentification multifacteur (MFA)** — code TOTP ou OTP par SMS.
- **Isolation stricte des données** : un parent ne voit UNIQUEMENT les données de ses propres enfants. Le parent A ne peut jamais accéder aux informations du parent B (à implémenter au niveau de l'API, pas seulement de l'interface).
- Conformité **RGPD** : consentement explicite, droit à l'effacement, minimisation des données.
- Chiffrement des données sensibles, HTTPS partout, journal d'audit complet.
- Sessions sécurisées (tokens courts + refresh, expiration automatique).

## 6. GESTION MULTI-ENFANTS (anticiper toutes les edge cases)

- Un parent peut avoir plusieurs enfants dans des classes différentes : **synchronisation parfaite et sans erreur** entre tous les profils.
- Anticiper et gérer proprement : paiements partiels, changements de classe en cours d'année, remboursements, élèves transférés, parents séparés avec tuteurs multiples, doublons d'élèves.

## 7. DESIGN ET EXPÉRIENCE UTILISATEUR

- Design **moderne, haut de gamme, original et très attirant**.
- **Extrêmement intuitif** : un utilisateur non technique doit pouvoir créer un compte et payer en moins de 2 minutes.
- **Mobile-first** (les parents utiliseront surtout leur téléphone).
- Tableaux de bord interactifs personnalisables.
- Langue principale : **français**.
- Thème cohérent, typographie soignée, micro-animations élégantes, aucune page "vide" ou cassée.

## 8. STACK TECHNIQUE

- **Frontend** : React (ou Next.js) + Tailwind CSS.
- **Backend** : API REST structurée en modules (auth, students, payments, notifications, reports, audit).
- **Base de données** : PostgreSQL ou SQLite pour la démo.
- **Temps réel** : WebSockets ou Server-Sent Events pour la mise à jour instantanée des paiements.
- **Exports** : PDF (côté serveur) et CSV.

## 9. EXIGENCES DE QUALITÉ DU CODE

- Code **propre, modulaire et bien organisé** : un développeur doit pouvoir ouvrir le projet, comprendre la structure en 5 minutes et corriger un bug sans difficulté.
- Gestion d'erreurs robuste avec messages clairs pour l'utilisateur.
- **Données de démonstration incluses** (établissement, classes, élèves, parents, quelques paiements) pour tester immédiatement toutes les fonctionnalités.
- README avec instructions d'installation et de lancement.
- **Aucune partie "TODO", aucun placeholder non fonctionnel** : chaque bouton doit faire quelque chose de réel.

Livre l'application **complète de bout en bout** : de l'inscription d'un parent jusqu'au rapport comptable exportable.

---
