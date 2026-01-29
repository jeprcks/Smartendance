'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { notificationService } from '@/app/services/notificationService';

export default function Navbar() {
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);

  const navItems = [
    { href: '/home/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/home/students', label: 'Students', icon: '👨‍🎓' },
    { href: '/home/teachers', label: 'Teachers', icon: '🧑‍🏫' },
    { href: '/home/messages', label: 'Messages', icon: '💬' },
    { href: '/home/history', label: 'History', icon: '⏰' },
    { href: '/home/schedules', label: 'Schedules', icon: '🗓️' },
    { href: '/home/reports', label: 'Reports', icon: '📈' },
  ];

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const count = await notificationService.getNotificationCount();
        setNotificationCount(count);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotificationCount, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="flex justify-between items-center navbar-row">
          {/* Logo & brand */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <Link href="/home/dashboard" className="flex items-center gap-1.5 min-w-0 group">
              <span className="navbar-logo-wrap">
                <img
                  src="/logo/umapadlogo.png"
                  alt="Umapad Elementary School Logo"
                  className="navbar-logo"
                />
              </span>
              <span className="navbar-brand">Umapad Elementary School</span>
            </Link>
          </div>

          {/* Nav links */}
          <div className="hidden md:block flex-shrink min-w-0">
            <div className="navbar-links">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`navbar-link ${isActive ? 'navbar-link-active' : ''}`}
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    <span className="navbar-link-icon" aria-hidden>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              href="/home/notifications"
              className="navbar-action navbar-action-bell"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={2} />
              {notificationCount > 0 && (
                <span className="navbar-badge">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>

            <div className="hidden md:block">
              <Link href="/logout" className="navbar-logout">
                <span aria-hidden>🚪</span>
                Logout
              </Link>
            </div>

            <div className="md:hidden">
              <button
                type="button"
                className="navbar-action"
                aria-label="Menu"
              >
                <span className="text-lg">☰</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}