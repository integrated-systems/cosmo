import { useEffect, useState } from 'react';

// projectcosmo.html-ийн theme toggle (мөр ~404-407) — localStorage
// хадгалалт ОГТ байхгүй, хуудас дахин ачаалахад үргэлж hardcode "dark"
// руу буцдаг байсан алдааг энд засав.
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('suh_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    try {
      localStorage.setItem('suh_theme', theme);
    } catch {
      /* localStorage байхгүй орчинд алгасна */
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggleTheme };
}
