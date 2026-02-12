'use client';

// Root page - middleware handles redirects to /login or /dashboard
// This component is just a fallback in case middleware doesn't catch it
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Redirecting...</p>
      </div>
    </div>
  );
}
