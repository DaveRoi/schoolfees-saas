import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader.jsx';
import { useLang } from '../i18n.jsx';

export default function Landing() {
  const { t } = useLang();

  return (
    <>
      <PublicHeader />
      <main className="main-content public-page">
        <div className="landing-hero-container">
          <div className="landing-hero-center">
            <div className="hero-tag-pill"><span>{t('landing.tag')}</span></div>
            <h1 className="landing-main-title">
              {t('landing.title1')} <br />
              <span className="gradient-text">{t('landing.title2')}</span>{t('landing.title3')}
            </h1>
            <p className="landing-subtitle">{t('landing.subtitle')}</p>
          </div>

          {/* Double porte */}
          <div className="two-doors-grid">
            <div className="door-card door-parent glass-card">
              <div className="door-glow glow-emerald" />
              <div className="door-header">
                <div className="door-avatar avatar-emerald">👨‍👩‍👧</div>
                <div>
                  <h2 className="door-title">{t('landing.parentDoor.title')}</h2>
                  <p className="door-desc">{t('landing.parentDoor.desc')}</p>
                </div>
              </div>
              <div className="partner-badges">
                <span className="partner-badge badge-momo">🟡 MTN MoMo</span>
                <span className="partner-badge badge-om">🟠 Orange Money</span>
                <span className="partner-badge">🛡️ {t('payments.receipt')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                <Link to="/login" className="btn emerald lg"><span>{t('landing.parentDoor.cta')}</span></Link>
                <Link to="/register" className="btn ghost block"><span>{t('landing.parentDoor.register')}</span></Link>
              </div>
            </div>

            <div className="door-card door-admin glass-card">
              <div className="door-glow glow-orange" />
              <div className="door-header">
                <div className="door-avatar avatar-orange">🏛️</div>
                <div>
                  <h2 className="door-title">{t('landing.adminDoor.title')}</h2>
                  <p className="door-desc">{t('landing.adminDoor.desc')}</p>
                </div>
              </div>
              <div className="partner-badges">
                <span className="partner-badge">📊 Cockpit</span>
                <span className="partner-badge">🧾 Grand livre</span>
                <span className="partner-badge">💬 WhatsApp/SMS</span>
              </div>
              <Link to="/login" className="btn orange lg"><span>{t('landing.adminDoor.cta')}</span></Link>
            </div>
          </div>

          {/* Ruban de confiance */}
          <div className="trust-ribbon">
            <span className="trust-chip">🟡 MTN Mobile Money</span>
            <span className="trust-chip">🟠 Orange Money Webpay</span>
            <span className="trust-chip">🏛️ Banque</span>
            <span className="trust-chip">🔒 SSL 256-bit</span>
          </div>

          {/* Avantages */}
          <div className="features-grid">
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="feature-icon bg-emerald">📈</div>
              <h3 className="feature-title">{t('landing.features.title1')}</h3>
              <p className="feature-desc">{t('landing.features.desc1')}</p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="feature-icon bg-orange">🛡️</div>
              <h3 className="feature-title">{t('landing.features.title2')}</h3>
              <p className="feature-desc">{t('landing.features.desc2')}</p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="feature-icon bg-blue">👨‍👩‍👧‍👦</div>
              <h3 className="feature-title">{t('landing.features.title3')}</h3>
              <p className="feature-desc">{t('landing.features.desc3')}</p>
            </div>
          </div>

          {/* Tarifs */}
          <div className="pricing-section">
            <div className="hero-tag-pill">{t('landing.pricing.tag')}</div>
            <h2 className="pricing-main-title">{t('landing.pricing.title')}</h2>
            <p className="pricing-subtitle">{t('landing.pricing.subtitle')}</p>

            <div className="pricing-cards-grid">
              <div className="pricing-card glass-card">
                <div className="pricing-badge">{t('menu.classes')} · 300</div>
                <h3 className="pricing-tier-name">{t('landing.pricing.t1.name')}</h3>
                <div className="pricing-price">99 000 <span className="pricing-period">{t('landing.pricing.perYear')}</span></div>
                <p className="pricing-for">{t('landing.pricing.t1.for')}</p>
                <ul className="pricing-features-list">
                  <li>✓ {t('landing.pricing.f1')}</li>
                  <li>✓ {t('landing.pricing.f2')}</li>
                  <li>✓ {t('landing.pricing.f3')}</li>
                  <li>✓ {t('landing.pricing.f4')}</li>
                  <li>✓ {t('landing.pricing.f5')}</li>
                </ul>
                <div style={{ marginTop: 'auto' }}>
                  <a href="https://wa.me/237670000000?text=Bonjour%2C%20EduPay%20Pack%20Evolution" target="_blank" rel="noreferrer" className="btn ghost block">{t('landing.pricing.demo')}</a>
                </div>
              </div>

              <div className="pricing-card glass-card popular">
                <div className="popular-ribbon">{t('landing.pricing.popular')}</div>
                <div className="pricing-badge" style={{ color: 'var(--primary)' }}>1 200</div>
                <h3 className="pricing-tier-name">{t('landing.pricing.t2.name')}</h3>
                <div className="pricing-price">199 000 <span className="pricing-period">{t('landing.pricing.perYear')}</span></div>
                <p className="pricing-for">{t('landing.pricing.t2.for')}</p>
                <ul className="pricing-features-list">
                  <li>✓ {t('landing.pricing.f6')}</li>
                  <li>✓ <strong>{t('landing.pricing.f7')}</strong></li>
                  <li>✓ {t('landing.pricing.f8')}</li>
                  <li>✓ {t('landing.pricing.f9')}</li>
                  <li>✓ {t('landing.pricing.f10')}</li>
                  <li>✓ {t('landing.pricing.f11')}</li>
                </ul>
                <div style={{ marginTop: 'auto' }}>
                  <a href="https://wa.me/237670000000?text=Bonjour%2C%20EduPay%20Pro%20Campus" target="_blank" rel="noreferrer" className="btn emerald block">{t('landing.pricing.equip')}</a>
                </div>
              </div>

              <div className="pricing-card glass-card">
                <div className="pricing-badge">{t('landing.pricing.custom')}</div>
                <h3 className="pricing-tier-name">{t('landing.pricing.t3.name')}</h3>
                <div className="pricing-price">{t('landing.pricing.custom')}</div>
                <p className="pricing-for">{t('landing.pricing.t3.for')}</p>
                <ul className="pricing-features-list">
                  <li>✓ {t('landing.pricing.f12')}</li>
                  <li>✓ {t('landing.pricing.f13')}</li>
                  <li>✓ {t('landing.pricing.f14')}</li>
                  <li>✓ {t('landing.pricing.f15')}</li>
                </ul>
                <div style={{ marginTop: 'auto' }}>
                  <a href="https://wa.me/237670000000?text=Bonjour%2C%20EduPay%20Elite" target="_blank" rel="noreferrer" className="btn ghost block">{t('landing.pricing.contact')}</a>
                </div>
              </div>
            </div>
          </div>

          <p className="mini" style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
            <Link to="/verifier-recu" style={{ color: 'var(--primary)', fontWeight: 700 }}>🛡️ {t('verify.title2')} →</Link>
          </p>
        </div>
      </main>
    </>
  );
}
