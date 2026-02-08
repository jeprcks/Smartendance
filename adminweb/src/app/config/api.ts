/**
 * Backend API base URL.
 *
 * Production: Set NEXT_PUBLIC_API_URL to your backend URL (e.g. https://your-backend.vercel.app).
 * The app will call that URL for /api/* (login, students, etc.). Backend CORS must allow your frontend origin.
 *
 * Development: Falls back to http://localhost:4000 when not set.
 */
function getApiBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
      : '';

  // Prefer explicit backend URL so login/API work even if rewrites aren't configured
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined') {
    const o = window.location.origin;
    // On production (same origin), rewrites in next.config proxy /api/* to backend when NEXT_PUBLIC_API_URL was set at build
    if (o && !o.includes('localhost')) return o;
  }

  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiBaseUrl();
