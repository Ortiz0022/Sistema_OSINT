import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      title={`Modo actual: ${isDark ? 'Oscuro' : 'Claro'}. Clic para cambiar.`}
    >
      <div className="theme-toggle__track">
        <Sun className={`theme-toggle__icon ${!isDark ? 'theme-toggle__icon--active' : ''}`} />
        <Moon className={`theme-toggle__icon ${isDark ? 'theme-toggle__icon--active' : ''}`} />
        <span className={`theme-toggle__thumb ${isDark ? 'theme-toggle__thumb--dark' : ''}`} />
      </div>
    </button>
  );
};

export default ThemeToggle;
