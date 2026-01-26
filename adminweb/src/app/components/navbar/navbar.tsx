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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5">
        <div className="flex justify-between items-center h-14 gap-2 min-w-0">
          <div className="flex items-center min-w-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <img 
                src="/logo/umapadlogo.png" 
                alt="Umapad Elementary School Logo" 
                className="h-12 w-12 shrink-0 object-contain"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] sm:overflow-visible sm:max-w-none">Umapad Elementary School</span>
            </div>  
          </div>

          <div className="hidden md:block flex-shrink min-w-0">
            <div className="ml-2 flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              href="/home/notifications"
              className="relative p-1.5 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[16px] h-4">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>

            <div className="hidden md:block">
              <Link
                href="/logout"
                className="px-2.5 py-1.5 rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 whitespace-nowrap"
              >
                <span className="mr-1">🚪</span>
                Logout
              </Link>
            </div>

            <div className="md:hidden">
              <button type="button" className="p-1.5 text-gray-600 hover:text-gray-900" aria-label="Menu">
                <span className="text-lg">☰</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}