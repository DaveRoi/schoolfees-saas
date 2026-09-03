import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './components/AuthContext.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';
import { LanguageProvider } from './i18n.jsx';
import './styles/global.css';

/** Barrière d'erreur : au lieu d'une page blanche silencieuse,
 *  toute erreur d'affichage montre un message clair + bouton de rechargement. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ui] erreur:', error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>
          <h2>Une erreur d'affichage est survenue / A display error occurred</h2>
          <p style={{ color: '#666' }}>{String(this.state.error?.message || this.state.error)}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}
          >
            Recharger / Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Migration : anciennes clés sf_* -> edupay_* (sessions préservées)
(function migrateStorage() {
  const map = { sf_token: 'edupay_token', sf_refresh: 'edupay_refresh' };
  for (const [oldK, newK] of Object.entries(map)) {
    const old = localStorage.getItem(oldK);
    if (old && !localStorage.getItem(newK)) localStorage.setItem(newK, old);
    localStorage.removeItem(oldK);
  }
  if (localStorage.getItem('edupay-theme') && !localStorage.getItem('edupay-lang')) localStorage.setItem('edupay-lang', 'fr');
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
