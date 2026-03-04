import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle-btn ${theme === 'dark' ? 'theme-toggle-btn--dark' : 'theme-toggle-btn--light'}`}
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      <div className="theme-toggle-slider">
        <div className="theme-toggle-icon-container">
          {theme === 'light' ? (
            <Sun size={18} className="theme-toggle-icon sun-icon" />
          ) : (
            <Moon size={18} className="theme-toggle-icon moon-icon" />
          )}
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;
