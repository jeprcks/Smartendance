import { API_BASE_URL } from '@/app/config/api';

export interface Settings {
  _id?: string;
  schoolName: string;
  logo?: string | null;
  watermarkLogo?: string | null;
  address?: string;
  lateThresholdMinutes: number;
  morningShiftCutoff: string;
  afternoonShiftCutoff: string;
  academicYear?: string;
  theme?: 'light' | 'dark';
}

const defaultSettings: Settings = {
  schoolName: 'Umapad Elementary School',
  logo: undefined,
  watermarkLogo: undefined,
  address: '',
  lateThresholdMinutes: 15,
  morningShiftCutoff: '12:00',
  afternoonShiftCutoff: '17:00',
  academicYear: '',
  theme: 'light',
};

export const THEME_STORAGE_KEY = 'theme';

export function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export const settingsService = {
  async getSettings(): Promise<Settings> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      return { ...defaultSettings, ...data };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return defaultSettings;
    }
  },

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }
    return response.json();
  },
};
