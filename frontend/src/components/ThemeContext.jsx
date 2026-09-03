import { createContext, useContext, useState, useEffect } from 'react';

const ThemeCtx = createContext(null);

/** Thème clair/sombre PARTAGÉ par toutes les pages (app, landing, login). */
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('edupay-theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('edupay-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
