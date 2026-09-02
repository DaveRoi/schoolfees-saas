import { NavLink, Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const ROLE_LABELS = {
  admin: 'Administrateur',
  coordinator: 'Coordinatrice',
  director: 'Directrice',
  parent: 'Parent',
};

/** Menu selon le rôle connecté. */
function menuFor(role) {
  if (role === 'parent')
    return [
      { to: '/mes-enfants', label: 'Mes enfants', icon: '👨‍👩‍👧‍👦' },
      { to: '/mes-paiements', label: 'Mes paiements', icon: '🧾' },
      { to: '/profil', label: 'Mon profil', icon: '⚙️' },
    ];
  const items = [
    { to: '/dashboard', label: 'Tableau de bord', icon: '📊' },
    { to: '/eleves', label: 'Élèves', icon: '🎓' },
    { to: '/paiements', label: 'Paiements', icon: '💳' },
    { to: '/rapports', label: 'Rapports', icon: '📁' },
  ];
  if (role === 'admin') {
    items.push({ to: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥' });
    items.push({ to: '/admin/classes', label: 'Classes & frais', icon: '🏫' });
  }
  items.push({ to: '/profil', label: 'Mon profil', icon: '⚙️' });
  return items;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="logo">
          🎓 SchoolFees <span className="badge">SaaS</span>
        </Link>
        {menuFor(user?.role).map((m) => (
          <NavLink key={m.to} to={m.to} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
            <span>{m.icon}</span> {m.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <div className="userbox">
          <b>{user?.full_name}</b>
          {ROLE_LABELS[user?.role] || user?.role}
          <div style={{ marginTop: 10 }}>
            <button className="btn ghost" style={{ width: '100%', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
