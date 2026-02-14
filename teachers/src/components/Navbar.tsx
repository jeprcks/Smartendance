'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';

export default function Navbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  return (
    <header className="navbar-teacher sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 md:px-6 shrink-0 min-h-[4rem]">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-[var(--radius)] transition-colors hover:bg-[var(--muted)]"
            style={{ color: 'var(--primary-dark)' }}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0 group">
          <span className="navbar-teacher-logo-wrap flex-shrink-0">
            <img
              src="/logo/umapadlogo.png"
              alt=""
              className="navbar-teacher-logo object-contain"
            />
          </span>
          <span className="navbar-teacher-brand truncate">
            Teacher Portal
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="navbar-teacher-logout flex items-center gap-2"
        >
          <span aria-hidden>🚪</span>
          Logout
        </button>
      </div>
    </header>
  );
}
