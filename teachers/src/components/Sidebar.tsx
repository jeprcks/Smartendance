'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';

const navIcons = {
  dashboard: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  schedule: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  students: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  attendance: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pastAttendance: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  reports: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: navIcons.dashboard },
  { href: '/schedule', label: 'Schedule', icon: navIcons.schedule },
  { href: '/students', label: 'Students', icon: navIcons.students },
  { href: '/History', label: 'History', icon: navIcons.attendance },
  { href: '/past-attendance', label: 'Past Attendance', icon: navIcons.pastAttendance },
  { href: '/reports', label: 'Reports', icon: navIcons.reports },
  { href: '/profile', label: 'Profile', icon: navIcons.profile },
];

export default function Sidebar({
  teacherName,
  teacherId,
  teacherEmail,
  profilePicture,
  onClose,
  isOpen,
  collapsed,
  onToggleCollapse,
}: {
  teacherName: string;
  teacherId?: string;
  teacherEmail?: string;
  profilePicture?: string | null;
  onClose?: () => void;
  isOpen?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push('/login');
    onClose?.();
  };

  const linkClass = (href: string) => {
    const isActive =
      pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return `flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] transition-colors duration-200 ${
      isActive ? 'font-medium' : 'hover:bg-[var(--muted)]'
    }`;
  };

  const linkStyle = (href: string) => {
    const isActive =
      pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return isActive
      ? {
          background: 'var(--primary)',
          color: 'white',
        }
      : {
          color: 'var(--foreground)',
        };
  };

  const initials = (teacherName || 'T')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const content = (
    <>
      <div
        className="relative p-4 border-b rounded-b-[var(--radius)]"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--muted) 100%)',
        }}
      >
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex absolute top-4 right-4 p-1.5 rounded-[var(--radius)] transition-colors duration-200 hover:bg-[var(--primary)] hover:text-white"
            style={{ color: 'var(--primary-dark)' }}
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <p className="text-xs uppercase tracking-wide mb-2 pr-10" style={{ color: 'var(--muted-foreground)' }}>
          Signed in as
        </p>
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-lg font-semibold ring-2 ring-[var(--primary)] ring-offset-2 overflow-hidden"
            style={{
              background: profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--secondary) 0%, var(--primary-light) 100%)',
              color: profilePicture ? 'transparent' : 'var(--primary-dark)',
            }}
            aria-hidden
          >
            {profilePicture ? (
              <img src={profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 w-full text-center space-y-0.5">
            <p className="font-semibold truncate" style={{ color: 'var(--primary-dark)' }}>
              {teacherName || 'Teacher'}
            </p>
            {teacherEmail && (
              <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                {teacherEmail}
              </p>
            )}
            {teacherId && (
              <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                ID: {teacherId}
              </p>
            )}
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={linkClass(item.href)}
            style={linkStyle(item.href)}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div
        className="p-4 border-t rounded-t-[var(--radius)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] transition-colors duration-200 hover:bg-[var(--destructive)]/10"
          style={{ color: 'var(--destructive)' }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </>
  );

  const showOverlay = isOpen === true;
  const hideOnMobile = isOpen === false;
  const isHidden = collapsed === true;

  return (
    <>
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`
          flex flex-col border-r
          fixed top-0 left-0 h-full z-50
          transform transition-all duration-200 ease-in-out
          md:relative md:translate-x-0 md:flex-shrink-0
          ${hideOnMobile ? '-translate-x-full' : 'translate-x-0'}
          ${isHidden ? 'md:w-0 md:overflow-hidden md:opacity-0 md:border-0' : 'w-64'}
        `}
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '2px 0 12px rgba(46, 125, 50, 0.08)',
        }}
      >
        {!isHidden && content}
      </aside>
      {collapsed && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex fixed left-4 top-4 z-40 w-9 h-9 items-center justify-center rounded-[var(--radius)] border shadow-md transition-all duration-200 hover:bg-[var(--primary)] hover:text-white hover:shadow-lg"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--primary)',
            color: 'var(--primary-dark)',
          }}
          aria-label="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </>
  );
}
