"use client";

import { useState, useEffect } from "react";
import { settingsService, Settings } from "@/app/services/settingsService";
import toast from "react-hot-toast";
import { Image, Building2, Clock, Calendar, Droplets } from "lucide-react";

export const SETTINGS_UPDATED_EVENT = "settingsUpdated";

/**
 * Resize & compress an image file entirely on the client before uploading.
 * - Scales down to maxPx × maxPx if larger (preserves aspect ratio)
 * - Re-encodes as WebP at the given quality (0–1)
 * Falls back to the original file if the browser doesn't support canvas/WebP.
 */
async function compressImage(
  file: File,
  maxPx = 1024,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(
        1,
        maxPx / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file); // fallback: upload original

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file); // fallback
          const ext = blob.type === "image/webp" ? ".webp" : ".png";
          const name = file.name.replace(/\.[^.]+$/, ext);
          resolve(new File([blob], name, { type: blob.type }));
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback: upload original
    };

    img.src = objectUrl;
  });
}

export default function SettingsPage() {
  const [form, setForm] = useState<Partial<Settings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isImagesLoading, setImagesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);

  useEffect(() => {
    // ── 1. Load config immediately (fast, ~1 KB) ─────────────────────────────
    settingsService
      .getSettings()
      .then((cfg) => {
        setForm({
          schoolName: cfg.schoolName,
          address: cfg.address ?? "",
          lateThresholdMinutes: cfg.lateThresholdMinutes ?? 15,
          morningShiftCutoff: cfg.morningShiftCutoff ?? "07:00",
          afternoonShiftCutoff: cfg.afternoonShiftCutoff ?? "13:00",
          academicYear: cfg.academicYear ?? "",
        });
      })
      .catch(() => {
        /* use form defaults */
      })
      .finally(() => setIsLoading(false));

    // ── 2. Load images ──────────────────────────────────────────────────
    // Images are now URL paths (/logo/logo.png) not base64 — loads instantly.
    settingsService
      .getImages()
      .then((imgs) => {
        const logoUrl = settingsService.resolveImageUrl(imgs.logo);
        const wmUrl = settingsService.resolveImageUrl(imgs.watermarkLogo);
        if (logoUrl) {
          setLogoPreview(logoUrl);
          setForm((f) => ({ ...f, logo: logoUrl }));
        }
        if (wmUrl) {
          setWatermarkPreview(wmUrl);
          setForm((f) => ({ ...f, watermarkLogo: wmUrl }));
        }
      })
      .catch(() => {
        /* no images — previews stay empty */
      })
      .finally(() => setImagesLoading(false));
  }, []);

  // ── Image upload helpers ────────────────────────────────────────────────────
  // Files are uploaded directly to the server (saved to public/logo/).
  // The database stores only a tiny URL path — no base64, no slow saves.

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview instantly — no waiting for the server
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);

    const toastId = toast.loading("Uploading logo…");
    try {
      const compressed = await compressImage(file);
      const url = await settingsService.uploadImage(compressed, "logo");
      URL.revokeObjectURL(localUrl);
      setLogoPreview(url);
      setForm((f) => ({ ...f, logo: url }));
      toast.success("Logo uploaded", { id: toastId });
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setLogoPreview(null);
      toast.error(err instanceof Error ? err.message : "Upload failed", {
        id: toastId,
      });
    }
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    setForm((f) => ({ ...f, logo: null }));
    try {
      await settingsService.removeImage("logo");
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo");
    }
  };

  const handleWatermarkChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview instantly — no waiting for the server
    const localUrl = URL.createObjectURL(file);
    setWatermarkPreview(localUrl);

    const toastId = toast.loading("Uploading watermark…");
    try {
      const compressed = await compressImage(file);
      const url = await settingsService.uploadImage(compressed, "watermark");
      URL.revokeObjectURL(localUrl);
      setWatermarkPreview(url);
      setForm((f) => ({ ...f, watermarkLogo: url }));
      toast.success("Watermark uploaded", { id: toastId });
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setWatermarkPreview(null);
      toast.error(err instanceof Error ? err.message : "Upload failed", {
        id: toastId,
      });
    }
  };

  const handleRemoveWatermark = async () => {
    setWatermarkPreview(null);
    setForm((f) => ({ ...f, watermarkLogo: null }));
    try {
      await settingsService.removeImage("watermark");
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success("Watermark removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove watermark",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Exclude logo and watermarkLogo from the update since they're already
      // saved by the upload endpoint. Only save the text settings here.
      const { logo, watermarkLogo, ...textSettings } = form;
      await settingsService.updateSettings(textSettings);
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
      toast.success("Settings saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="content-section">
          <p className="text-[var(--muted-foreground)]">Loading settings…</p>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]";
  const btnSecondaryCls =
    "px-4 py-2 border border-[var(--border)] rounded-[var(--radius)] text-sm font-medium bg-[var(--surface)] cursor-pointer hover:bg-[var(--secondary)] transition-colors w-fit";

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Settings</h1>
            <p>Configure school information and attendance rules</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── School Branding ──────────────────────────────────────────────── */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Image size={20} className="text-[var(--primary)]" />
            School Branding
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* School name */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                School Name
              </label>
              <input
                type="text"
                value={form.schoolName ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, schoolName: e.target.value }))
                }
                className={inputCls}
                placeholder="e.g. Umapad Elementary School"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Shown beside the logo in the navbar
              </p>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Logo Image
              </label>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">
                Shown in the navbar
              </p>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-[var(--radius)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--muted)]">
                  {isImagesLoading ? (
                    <span className="text-[var(--muted-foreground)] text-xs">
                      …
                    </span>
                  ) : logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[var(--muted-foreground)] text-xs">
                      None
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className={`inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-dark)] ${btnSecondaryCls}`}
                  >
                    <Image size={16} />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
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

            {/* Watermark */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Watermark Logo
              </label>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">
                Shown faintly in the background on all pages
              </p>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-[var(--radius)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--muted)]">
                  {isImagesLoading ? (
                    <span className="text-[var(--muted-foreground)] text-xs">
                      …
                    </span>
                  ) : watermarkPreview ? (
                    <img
                      src={watermarkPreview}
                      alt="Watermark"
                      className="w-full h-full object-contain opacity-70"
                    />
                  ) : (
                    <span className="text-[var(--muted-foreground)] text-xs">
                      None
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className={`inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-dark)] ${btnSecondaryCls}`}
                  >
                    <Droplets size={16} />
                    Upload Watermark
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleWatermarkChange}
                    />
                  </label>
                  {watermarkPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveWatermark}
                      className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius)] text-sm font-medium text-[var(--destructive)] bg-[var(--surface)] hover:bg-destructive/10 transition-colors w-fit"
                    >
                      Remove watermark
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── School Information ───────────────────────────────────────────── */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-[var(--primary)]" />
            School Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Address
            </label>
            <textarea
              value={form.address ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              rows={2}
              className={inputCls}
              placeholder="School address"
            />
          </div>
        </div>

        {/* ── Attendance Rules ─────────────────────────────────────────────── */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Clock size={20} className="text-[var(--primary)]" />
            Attendance Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Late Threshold (minutes)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={form.lateThresholdMinutes ?? 15}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    lateThresholdMinutes: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Minutes after shift time-in before marking Late
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Morning Shift Time-in
              </label>
              <input
                type="time"
                value={form.morningShiftCutoff ?? "07:00"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, morningShiftCutoff: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Afternoon Shift Time-in
              </label>
              <input
                type="time"
                value={form.afternoonShiftCutoff ?? "13:00"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    afternoonShiftCutoff: e.target.value,
                  }))
                }
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── Academic Year ────────────────────────────────────────────────── */}
        <div className="content-section">
          <h2 className="text-lg font-semibold text-[var(--primary-dark)] mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-[var(--primary)]" />
            Academic Year
          </h2>
          <input
            type="text"
            value={form.academicYear ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, academicYear: e.target.value }))
            }
            className={`${inputCls} max-w-xs`}
            placeholder="e.g. 2024-2025"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
