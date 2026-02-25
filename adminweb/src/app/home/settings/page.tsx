'use client';

import { useState, useEffect } from 'react';
import { settingsService, Settings, applyTheme } from '@/app/services/settingsService';
import toast from 'react-hot-toast';
import { Image, Building2, Clock, Calendar, Droplets, Sun, Moon } from 'lucide-react';

const SETTINGS_UPDATED_EVENT = 'settingsUpdated';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Partial<Settings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
        setForm({
          schoolName: data.schoolName,
          logo: data.logo,
          watermarkLogo: data.watermarkLogo,
          theme: data.theme ?? 'light',
          address: data.address ?? '',
          lateThresholdMinutes: data.lateThresholdMinutes ?? 15,
          morningShiftCutoff: data.morningShiftCutoff ?? '12:00',
          afternoonShiftCutoff: data.afternoonShiftCutoff ?? '17:00',
          academicYear: data.academicYear ?? '',
        });
        if (data.logo) setLogoPreview(data.logo);
        if (data.watermarkLogo) setWatermarkPreview(data.watermarkLogo);
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setForm((f) => ({ ...f, logo: base64 }));
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setForm((f) => ({ ...f, logo: null }));
    setLogoPreview(null);
    try {
      const updated = await settingsService.updateSettings({ logo: null });
      setSettings(updated);
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success('Logo removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove logo');
    }
  };

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setForm((f) => ({ ...f, watermarkLogo: base64 }));
      setWatermarkPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWatermark = async () => {
    setForm((f) => ({ ...f, watermarkLogo: null }));
    setWatermarkPreview(null);
    try {
      const updated = await settingsService.updateSettings({ watermarkLogo: null });
      setSettings(updated);
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success('Watermark removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove watermark');
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    setForm((f) => ({ ...f, theme }));
    try {
      const updated = await settingsService.updateSettings({ theme });
      setSettings(updated);
      applyTheme(theme);
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success(`Theme set to ${theme}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update theme');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await settingsService.updateSettings(form);
      setSettings(updated);
      const theme = (updated.theme ?? form.theme ?? 'light') as 'light' | 'dark';
      applyTheme(theme);
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="content-section">
          <p className="text-[var(--muted-foreground)]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Settings</h1>
            <p>Configure school information,attendance rules</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Appearance */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Sun size={20} className="text-[var(--primary)]" />
            Theme
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Choose light or dark theme for the application</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-2 px-6 py-3 rounded-[var(--radius)] border-2 transition-all ${
                (form.theme ?? 'light') === 'light'
                  ? 'border-[var(--primary)] bg-[var(--secondary)] text-[var(--primary-dark)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/50'
              }`}
            >
              <Sun size={20} />
              Light
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-2 px-6 py-3 rounded-[var(--radius)] border-2 transition-all ${
                form.theme === 'dark'
                  ? 'border-[var(--primary)] bg-[var(--secondary)] text-[var(--primary-dark)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/50'
              }`}
            >
              <Moon size={20} />
              Dark
            </button>
          </div>
        </div>

        {/* School Branding */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Image size={20} className="text-[var(--primary)]" />
            School Branding (Navbar)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">School Name</label>
              <input
                type="text"
                value={form.schoolName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="e.g. Umapad Elementary School"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Shown beside the logo in the navbar</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Logo Image</label>
              <p className="text-xs text-[var(--muted-foreground)] mb-2 min-h-[1rem]">Shown in the navbar</p>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-[var(--radius)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--muted)]">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[var(--muted-foreground)] text-xs">None</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-sm font-medium text-[var(--primary-dark)] cursor-pointer hover:bg-[var(--secondary)] transition-colors w-fit">
                    <Image size={16} />
                    Upload Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius)] text-sm font-medium text-[var(--destructive)] bg-[var(--surface)] hover:bg-destructive/10 transition-colors w-fit"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Watermark Logo</label>
              <p className="text-xs text-[var(--muted-foreground)] mb-2 min-h-[1rem]">Shown faintly in the background on all pages</p>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-[var(--radius)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--muted)]">
                  {watermarkPreview ? (
                    <img src={watermarkPreview} alt="Watermark" className="w-full h-full object-contain opacity-70" />
                  ) : (
                    <span className="text-[var(--muted-foreground)] text-xs">None</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-sm font-medium text-[var(--primary-dark)] cursor-pointer hover:bg-[var(--secondary)] transition-colors w-fit">
                    <Droplets size={16} className="inline mr-2 align-middle" />
                    Upload Watermark
                    <input type="file" accept="image/*" className="hidden" onChange={handleWatermarkChange} />
                  </label>
                  {watermarkPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveWatermark}
                      className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius)] text-sm font-medium text-[var(--destructive)] bg-[var(--surface)] hover:bg-destructive/10 transition-colors w-fit"
                    >
                      Remove watermark logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* School Info */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-[var(--primary)]" />
            School Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Address</label>
            <textarea
              value={form.address ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="School address"
            />
          </div>
        </div>

        {/* Attendance Rules */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Clock size={20} className="text-[var(--primary)]" />
            Attendance Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Late Threshold (minutes)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={form.lateThresholdMinutes ?? 15}
                onChange={(e) => setForm((f) => ({ ...f, lateThresholdMinutes: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Minutes after cutoff = Late</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Morning Shift Cutoff</label>
              <input
                type="time"
                value={form.morningShiftCutoff ?? '12:00'}
                onChange={(e) => setForm((f) => ({ ...f, morningShiftCutoff: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Afternoon Shift Cutoff</label>
              <input
                type="time"
                value={form.afternoonShiftCutoff ?? '17:00'}
                onChange={(e) => setForm((f) => ({ ...f, afternoonShiftCutoff: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
        </div>

        {/* Academic Year */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-[var(--primary)]" />
            Academic Year
          </h2>
          <div>
            <input
              type="text"
              value={form.academicYear ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              className="w-full max-w-xs px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="e.g. 2024-2025"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export { SETTINGS_UPDATED_EVENT };
