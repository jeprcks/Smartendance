/**
 * Backend API base URL.
 *
 * Production (Vercel):
 * - Set NEXT_PUBLIC_API_URL in Vercel to your backend (e.g. https://your-api.railway.app).
 * - Requests from the app use same origin (your Vercel domain); next.config rewrites
 *   proxy /api/* to your backend so CORS is not needed and localhost is never called.
 *
 * Development:
 * - Falls back to http://localhost:4000 when not set.
 */
function getApiBaseUrl(): string {
  // In browser on production: use same origin so rewrites proxy to backend (no CORS, no localhost)
  if (typeof window !== 'undefined') {
    const o = window.location.origin;
    if (o && !o.includes('localhost')) return o;
  }

  const envUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : '';

  if (envUrl) return envUrl;

  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiBaseUrl();
