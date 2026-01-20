'use client';


import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/home/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/home/students', label: 'Students', icon: '👨‍🎓' },
    { href: '/home/teachers', label: 'Teachers', icon: '🧑‍🏫' },
    { href: '/home/messages', label: 'Messages', icon: '💬' },
    { href: '/home/history', label: 'History', icon: '⏰' },
    { href: '/home/schedules', label: 'Schedules', icon: '🗓️' },

    // { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-2xl mr-2">🏫</span>
              <span className="text-xl font-bold text-gray-900">Umapad Elementary School </span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <Link
                href="/logout"
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
              >
                <span className="mr-2">🚪</span>
                Logout
              </Link>
            </div>

            <div className="md:hidden">
              <button className="text-gray-600 hover:text-gray-900">
                <span className="text-xl">☰</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}