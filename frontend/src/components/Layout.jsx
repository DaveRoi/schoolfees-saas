import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useTheme } from './ThemeContext.jsx';
import { useLang } from '../i18n.jsx';

/** Menu selon le rôle connecté. */
function menuFor(role, t) {
  if (role === 'parent')
    return [
      { to: '/app/mes-enfants', label: t('menu.myChildren'), icon: '👨‍👩‍👧' },
      { to: '/app/mes-paiements', label: t('menu.myPayments'), icon: '🧾' },
      { to: '/app/profil', label: t('menu.profile'), icon: '⚙️' },
    ];
  const items = [
    { to: '/app/dashboard', label: t('menu.dashboard'), icon: '📊' },
    { to: '/app/eleves', label: t('menu.students'), icon: '🎓' },
    { to: '/app/paiements', label: t('menu.payments'), icon: '💳' },
    { to: '/app/rapports', label: t('menu.reports'), icon: '📁' },
  ];
  if (role === 'admin') {
    items.push({ to: '/app/admin/utilisateurs', label: t('menu.users'), icon: '👥' });
    items.push({ to: '/app/admin/classes', label: t('menu.classes'), icon: '🏫' });
  }
  items.push({ to: '/app/profil', label: t('menu.profile'), icon: '⚙️' });
  return items;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { lang, toggle: toggleLang, t } = useLang();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const doLogout = async () => { await logout(); nav('/login'); };
  const menu = menuFor(user?.role, t);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-container">
          <div className="flex" style={{ gap: '.8rem', alignItems: 'center' }}>
            <button className="burger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">☰</button>
            <Link to="/app" className="brand-logo">
              <div className="logo-badge-icon">🎓</div>
              <span className="logo-title">EduPay <span className="logo-badge-edu">Cameroun</span></span>
            </Link>
            {user?.school?.name && (
              <div className="school-chip">
                <span>🏛️</span>
                <span className="chip-name">{user.school.name}</span>
              </div>
            )}
          </div>

          <nav className="portal-nav">
            {menu.map((m) => (
              <NavLink key={m.to} to={m.to} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                <span>{m.icon}</span> {m.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button className="lang-switch" onClick={toggleLang} title="FR / EN">
              <b>{lang === 'fr' ? 'FR' : 'EN'}</b>
            </button>
            <button className="theme-toggle" onClick={toggle} title="Light / Dark">{dark ? '☀️' : '🌙'}</button>
          </div>
        </div>
      </header>

      <div className="sub-bar">
        <div className="sub-bar-container">
          <div className="live-indicator">
            <span className="pulse-dot" />
            <span className="long">Passerelles : <strong>MTN MoMo</strong> 🟢 · <strong>Orange Money</strong> 🟢 · <strong>WhatsApp</strong> 🟢</span>
          </div>
          <div className="year-badge">{t('menu.services')}</div>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu" onClick={() => setMobileOpen(false)}>
          {menu.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
              <span>{m.icon}</span> {m.label}
            </NavLink>
          ))}
          <button className="lang-switch" onClick={(e) => { e.stopPropagation(); toggleLang(); }} style={{ marginTop: '.5rem', alignSelf: 'flex-start' }}>
            {lang === 'fr' ? 'FR → EN' : 'EN → FR'}
          </button>
          <button className="nav-btn" onClick={doLogout}>🚪 {t('common.logout')}</button>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
