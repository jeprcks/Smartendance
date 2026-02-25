'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { settingsService, applyTheme } from '@/app/services/settingsService';

const SETTINGS_UPDATED_EVENT = 'settingsUpdated';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await settingsService.getSettings();
        const currentTheme = (settings.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
        setTheme(currentTheme);
      } catch {
        const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
        setTheme(stored || 'light');
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();

    const handler = () => loadTheme();
    window.addEventListener(SETTINGS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, handler);
  }, []);

  const toggleTheme = async () => {
    const newTheme = (theme === 'light' ? 'dark' : 'light') as 'light' | 'dark';
    setTheme(newTheme);
    try {
      await settingsService.updateSettings({ theme: newTheme });
      applyTheme(newTheme);
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
    } catch (error) {
      console.error('Failed to update theme:', error);
      setTheme(theme);
    }
  };

  if (isLoading) {
    return (
      <button
        type="button"
        className="navbar-action"
        aria-label="Loading"
        disabled
      >
        <Sun size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="navbar-action"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <Moon size={18} strokeWidth={2} />
      ) : (
        <Sun size={18} strokeWidth={2} />
      )}
    </button>
  );
}
