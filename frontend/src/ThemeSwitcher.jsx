import React, { useState, useEffect } from 'react';

function ThemeSwitcher() {
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="theme-switch-tab" onClick={toggleTheme}>
      <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
    </div>
  );
}

export default ThemeSwitcher;
