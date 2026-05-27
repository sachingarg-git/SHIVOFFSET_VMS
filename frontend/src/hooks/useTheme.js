import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('vms_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vms_theme', theme);
  }, [theme]);

  // Apply on first render (handles page refresh)
  useEffect(() => {
    const saved = localStorage.getItem('vms_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
