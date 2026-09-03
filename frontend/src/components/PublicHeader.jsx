import { Link } from 'react-router-dom';
import { useTheme } from './ThemeContext.jsx';
import { useLang } from '../i18n.jsx';

/** Header public (landing, vérification reçus) — logo, langue, thème. */
export default function PublicHeader() {
  const { dark, toggle } = useTheme();
  const { lang, toggle: toggleLang } = useLang();

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="brand-logo">
          <div className="logo-badge-icon">🎓</div>
          <span className="logo-title">EduPay <span className="logo-badge-edu">Cameroun</span></span>
        </Link>
        <div className="header-actions">
          <button className="lang-switch" onClick={toggleLang} title="FR / EN">
            <b>{lang === 'fr' ? 'FR' : 'EN'}</b>
          </button>
          <button className="theme-toggle" onClick={toggle} title="Mode clair / sombre">{dark ? '☀️' : '🌙'}</button>
        </div>
      </div>
    </header>
  );
}
