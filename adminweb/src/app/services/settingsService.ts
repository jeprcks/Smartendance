import { API_BASE_URL } from "@/app/config/api";

export interface Settings {
  _id?: string;
  schoolName: string;
  address?: string;
  lateThresholdMinutes: number;
  morningShiftCutoff: string;
  afternoonShiftCutoff: string;
  academicYear?: string;
  theme?: "light" | "dark";
  // Images are NOT included in getSettings() — use getImages() for those
  logo?: string | null;
  watermarkLogo?: string | null;
}

export interface SettingsImages {
  _id?: string;
  logo: string | null;
  watermarkLogo: string | null;
}

export const defaultSettings: Settings = {
  schoolName: "Umapad Elementary School",
  address: "",
  lateThresholdMinutes: 15,
  morningShiftCutoff: "07:00",
  afternoonShiftCutoff: "13:00",
  academicYear: "",
  theme: "light",
};

export const defaultImages: SettingsImages = {
  logo: null,
  watermarkLogo: null,
};

export const THEME_STORAGE_KEY = "theme";

export function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// ─── Config cache (no images, ~1 KB) ─────────────────────────────────────────
let _cfg: Settings | null = null;
let _cfgTime = 0;
let _cfgPending: Promise<Settings> | null = null;

// ─── Images cache (~4.4 MB) ──────────────────────────────────────────────────
let _img: SettingsImages | null = null;
let _imgTime = 0;
let _imgPending: Promise<SettingsImages> | null = null;

const TTL = 5 * 60 * 1000; // 5 minutes client-side

export const settingsService = {
  /**
   * Fast — returns config only (no logo / watermarkLogo).
   * Used by ThemeProvider, ThemeToggle, Navbar (school name), etc.
   * Multiple simultaneous callers share one in-flight request.
   */
  async getSettings(): Promise<Settings> {
    if (_cfg && Date.now() - _cfgTime < TTL) return _cfg;
    if (_cfgPending) return _cfgPending;

    _cfgPending = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        _cfg = { ...defaultSettings, ...data };
        _cfgTime = Date.now();
        return _cfg!;
      } catch {
        return _cfg ?? defaultSettings;
      } finally {
        _cfgPending = null;
      }
    })();

    return _cfgPending;
  },

  /**
   * Slow — returns only { logo, watermarkLogo } (~4.4 MB).
   * Only called by: Navbar (logo), Watermark component, Settings page.
   * Also deduplicated so concurrent calls share one request.
   */
  async getImages(): Promise<SettingsImages> {
    if (_img && Date.now() - _imgTime < TTL) return _img;
    if (_imgPending) return _imgPending;

    _imgPending = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/images`);
        if (!res.ok) throw new Error("Failed to fetch settings images");
        const data = await res.json();
        _img = {
          logo: data.logo ?? null,
          watermarkLogo: data.watermarkLogo ?? null,
        };
        _imgTime = Date.now();
        return _img!;
      } catch {
        return _img ?? defaultImages;
      } finally {
        _imgPending = null;
      }
    })();

    return _imgPending;
  },

  /**
   * Update settings — returns config only (fast response).
   * Clears both caches so next call fetches fresh data.
   */
  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Failed to save settings");
    }
    const data = await res.json();
    // Update config cache with fresh data
    _cfg = { ...defaultSettings, ...data };
    _cfgTime = Date.now();
    // Clear images cache — they may have changed
    _img = null;
    _imgTime = 0;
    return _cfg;
  },

  /**
   * Upload a logo or watermark image file to the server.
   * The server saves it to public/logo/ and returns the URL path.
   * type: 'logo' | 'watermark'
   */
  async uploadImage(file: File, type: "logo" | "watermark"): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/settings/upload/${type}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Upload failed");
    }
    const { url } = (await res.json()) as { url: string };
    // Clear images cache so getImages() returns the new URL next call
    _img = null;
    _imgTime = 0;
    // Return the full URL so the page can preview it immediately
    return `${API_BASE_URL}${url}`;
  },

  /**
   * Delete a logo or watermark from the server and clear it from the database.
   * type: 'logo' | 'watermark'
   */
  async removeImage(type: "logo" | "watermark"): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/settings/image/${type}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Remove failed");
    }
    _img = null;
    _imgTime = 0;
  },

  /**
   * Convert a stored image value to a displayable URL.
   * Old base64 values are returned as-is.
   * New file-path values (/logo/logo.png) are prefixed with API_BASE_URL.
   */
  resolveImageUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.startsWith("data:")) return value; // legacy base64
    if (value.startsWith("http")) return value; // already absolute
    return `${API_BASE_URL}${value}`; // relative path
  },

  clearCache() {
    _cfg = null;
    _cfgTime = 0;
    _img = null;
    _imgTime = 0;
  },
};
