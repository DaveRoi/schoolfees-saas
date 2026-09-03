import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-hero-container">
      <div className="landing-hero-center">
        <div className="hero-tag-pill"><span>✨</span> La Révolution du Paiement Scolaire au Cameroun</div>
        <h1 className="landing-main-title">
          La Gestion & le Recouvrement des <br />
          <span className="gradient-text">Pensions Scolaires</span>, en toute Sérénité
        </h1>
        <p className="landing-subtitle">
          Finies les files d'attente aux guichets et les incertitudes sur les tranches. Payez instantanément par{' '}
          <strong>MTN Mobile Money</strong> ou <strong>Orange Money</strong> et recevez vos quittances officielles certifiées.
        </p>
      </div>

      {/* Double porte */}
      <div className="two-doors-grid">
        <div className="door-card door-parent glass-card">
          <div className="door-glow glow-emerald" />
          <div className="door-header">
            <div className="door-avatar avatar-emerald">👨‍👩‍👧</div>
            <div>
              <h2 className="door-title">Espace Parents & Fratrie</h2>
              <p className="door-desc">Consultez l'échéancier et réglez la scolarité de vos enfants, où que vous soyez.</p>
            </div>
          </div>
          <div className="partner-badges">
            <span className="partner-badge badge-momo">🟡 MTN MoMo</span>
            <span className="partner-badge badge-om">🟠 Orange Money</span>
            <span className="partner-badge">🛡️ Reçus certifiés</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            <Link to="/login" className="btn emerald lg"><span>Se connecter à l'Espace Famille ➔</span></Link>
            <Link to="/register" className="btn ghost block"><span>Créer un compte parent (code école requis)</span></Link>
          </div>
        </div>

        <div className="door-card door-admin glass-card">
          <div className="door-glow glow-orange" />
          <div className="door-header">
            <div className="door-avatar avatar-orange">🏛️</div>
            <div>
              <h2 className="door-title">Espace Établissement & Caisse</h2>
              <p className="door-desc">Pour la Direction, l'Économat et les Coordinateurs : comptabilité en temps réel.</p>
            </div>
          </div>
          <div className="partner-badges">
            <span className="partner-badge">📊 Cockpit financier</span>
            <span className="partner-badge">🧾 Grand livre</span>
            <span className="partner-badge">💬 Relances SMS/WhatsApp</span>
          </div>
          <Link to="/login" className="btn orange lg"><span>Connexion Staff Établissement ➔</span></Link>
        </div>
      </div>

      {/* Ruban de confiance */}
      <div className="trust-ribbon">
        <span className="trust-chip">🟡 MTN Mobile Money</span>
        <span className="trust-chip">🟠 Orange Money Webpay</span>
        <span className="trust-chip">🏛️ Dépôts & Virements Bancaires</span>
        <span className="trust-chip">🔒 Chiffrement SSL 256-bit</span>
      </div>

      {/* Avantages */}
      <div className="features-grid">
        <div className="feature-card glass-card" style={{ padding: '1.5rem' }}>
          <div className="feature-icon bg-emerald">📈</div>
          <h3 className="feature-title">+35% à +50% de Recouvrement</h3>
          <p className="feature-desc">Réduction drastique des retards et impayés grâce aux relances proactives WhatsApp et SMS avant chaque échéance.</p>
        </div>
        <div className="feature-card glass-card" style={{ padding: '1.5rem' }}>
          <div className="feature-icon bg-orange">🛡️</div>
          <h3 className="feature-title">Anti-Fraude & Zéro Fuite de Caisse</h3>
          <p className="feature-desc">Chaque encaissement émet instantanément un SMS au parent et une quittance horodatée scellée par signature numérique.</p>
        </div>
        <div className="feature-card glass-card" style={{ padding: '1.5rem' }}>
          <div className="feature-icon bg-blue">👨‍👩‍👧‍👦</div>
          <h3 className="feature-title">Expérience Parent Inégalée</h3>
          <p className="feature-desc">Bascule instantanée entre enfants de la fratrie, paiement direct sans vous déplacer, reçus téléchargeables.</p>
        </div>
      </div>

      {/* Tarifs */}
      <div className="pricing-section">
        <div className="hero-tag-pill">💼 Offres Établissements Scolaires</div>
        <h2 className="pricing-main-title">Des Formules Adaptées à chaque École</h2>
        <p className="pricing-subtitle">Déployez EduPay dans votre établissement en moins de 48 heures, sans frais d'infrastructure.</p>

        <div className="pricing-cards-grid">
          <div className="pricing-card glass-card">
            <div className="pricing-badge">Primaire & Collège</div>
            <h3 className="pricing-tier-name">Pack Évolution</h3>
            <div className="pricing-price">99 000 <span className="pricing-period">FCFA / an</span></div>
            <p className="pricing-for">Pour écoles jusqu'à 300 élèves</p>
            <ul className="pricing-features-list">
              <li>✓ Paiements MTN MoMo & Orange Money</li>
              <li>✓ Espace Parent & Gestion Fratries</li>
              <li>✓ Reçus certifiés</li>
              <li>✓ Journal de Caisse Économe</li>
              <li>✓ 1 000 Relances SMS incluses</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <a href="https://wa.me/237670000000?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20Pack%20%C3%89volution%20EduPay" target="_blank" rel="noreferrer" className="btn ghost block">Demander une Démo</a>
            </div>
          </div>

          <div className="pricing-card glass-card popular">
            <div className="popular-ribbon">⭐ Le Plus Populaire</div>
            <div className="pricing-badge" style={{ color: 'var(--primary)' }}>Lycées & Instituts</div>
            <h3 className="pricing-tier-name">Pack Pro Campus</h3>
            <div className="pricing-price">199 000 <span className="pricing-period">FCFA / an</span></div>
            <p className="pricing-for">Pour établissements jusqu'à 1 200 élèves</p>
            <ul className="pricing-features-list">
              <li>✓ Toutes les fonctionnalités Évolution</li>
              <li>✓ <strong>Moteur de Relance WhatsApp Intelligent</strong></li>
              <li>✓ Cockpit Financier Direction & Prévisions</li>
              <li>✓ Exports Comptables PDF/CSV</li>
              <li>✓ Formation du staff incluse</li>
              <li>✓ Support technique dédié</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <a href="https://wa.me/237670000000?text=Bonjour%2C%20je%20veux%20le%20Pack%20Pro%20Campus%20EduPay" target="_blank" rel="noreferrer" className="btn emerald block">Équiper mon Établissement</a>
            </div>
          </div>

          <div className="pricing-card glass-card">
            <div className="pricing-badge">Groupes & Réseaux</div>
            <h3 className="pricing-tier-name">Pack Élite Réseau</h3>
            <div className="pricing-price">Sur Mesure</div>
            <p className="pricing-for">Multi-Campus & Universités</p>
            <ul className="pricing-features-list">
              <li>✓ Gestion Multi-Établissements centralisée</li>
              <li>✓ Rapprochement bancaire automatisé</li>
              <li>✓ Vue consolidée du groupe</li>
              <li>✓ Gestionnaire de Compte VIP Dédié</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <a href="https://wa.me/237670000000?text=Bonjour%2C%20pack%20%C3%89lite%20R%C3%A9seau%20EduPay" target="_blank" rel="noreferrer" className="btn ghost block">Contacter notre Équipe</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
