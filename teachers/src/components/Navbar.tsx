'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  return (
    <header className="navbar-teacher sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 md:px-6 shrink-0 min-h-[4rem]">
      <div className="flex items-center gap-3 min-w-0">
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
