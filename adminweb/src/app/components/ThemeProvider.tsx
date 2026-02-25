'use client';

import { useEffect } from 'react';
import { settingsService, applyTheme, THEME_STORAGE_KEY } from '@/app/services/settingsService';

const SETTINGS_UPDATED_EVENT = 'settingsUpdated';

export default function ThemeProvider() {
  useEffect(() => {
    const syncFromSettings = async () => {
      try {
        const s = await settingsService.getSettings();
        const theme = (s.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
        applyTheme(theme);
      } catch {
        // Keep localStorage/default
      }
    };

    syncFromSettings();

    const handler = () => syncFromSettings();
    window.addEventListener(SETTINGS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, handler);
  }, []);

  return null;
}

export { THEME_STORAGE_KEY };
