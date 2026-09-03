import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const ROLE_LABELS = {
  admin: 'Administrateur',
  coordinator: 'Coordinatrice',
  director: 'Directrice',
  parent: 'Parent',
};

/** Menu selon le rôle connecté (préfixé /app). */
function menuFor(role) {
  if (role === 'parent')
    return [
      { to: '/app/mes-enfants', label: 'Mes enfants', icon: '👨‍👩‍👧' },
      { to: '/app/mes-paiements', label: 'Mes paiements', icon: '🧾' },
      { to: '/app/profil', label: 'Mon profil', icon: '⚙️' },
    ];
  const items = [
    { to: '/app/dashboard', label: 'Tableau de bord', icon: '📊' },
    { to: '/app/eleves', label: 'Élèves', icon: '🎓' },
    { to: '/app/paiements', label: 'Paiements', icon: '💳' },
    { to: '/app/rapports', label: 'Rapports', icon: '📁' },
  ];
  if (role === 'admin') {
    items.push({ to: '/app/admin/utilisateurs', label: 'Utilisateurs', icon: '👥' });
    items.push({ to: '/app/admin/classes', label: 'Classes & frais', icon: '🏫' });
  }
  items.push({ to: '/app/profil', label: 'Mon profil', icon: '⚙️' });
  return items;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('edupay-theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('edupay-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);
  const doLogout = async () => { await logout(); nav('/login'); };

  const menu = menuFor(user?.role);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-container">
          <div className="flex" style={{ gap: '1rem', alignItems: 'center' }}>
            <button className="burger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">☰</button>
            <Link to="/app" className="brand-logo">
              <div className="logo-badge-icon">🎓</div>
              <span className="logo-title">EduPay <span className="logo-badge-edu">Cameroun</span></span>
            </Link>
            {user?.school?.name && (
              <div className="school-chip">
                <span>🏛️</span>
                <span className="chip-name">{user.school.name}</span>
                {user.school.city && <span>· {user.school.city}</span>}
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
            <div className="school-chip" style={{ padding: '.35rem .7rem' }}>
              <b>{user?.full_name?.split(' ')[0]}</b> · {ROLE_LABELS[user?.role] || ''}
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title="Mode clair / sombre">{dark ? '☀️' : '🌙'}</button>
            <button className="btn ghost sm" onClick={doLogout}>Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="sub-bar">
        <div className="sub-bar-container">
          <div className="live-indicator">
            <span className="pulse-dot" />
            <span className="long">Passerelles : <strong>MTN MoMo</strong> 🟢 · <strong>Orange Money</strong> 🟢 · <strong>WhatsApp</strong> 🟢</span>
            <span>🟢 Services actifs</span>
          </div>
          <div className="year-badge">📅 Paiements sécurisés · Reçus certifiés</div>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu" onClick={() => setMobileOpen(false)}>
          {menu.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
              <span>{m.icon}</span> {m.label}
            </NavLink>
          ))}
          <button className="nav-btn" onClick={doLogout}>🚪 Se déconnecter</button>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
