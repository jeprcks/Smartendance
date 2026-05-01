"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { notificationService } from "@/app/services/notificationService";
import { settingsService } from "@/app/services/settingsService";
import ThemeToggle from "@/app/components/ThemeToggle";

const NOTIFICATION_LAST_SEEN_KEY = "notificationLastSeenCount";
const DEFAULT_SCHOOL_NAME = "Umapad Elementary School";

export default function Navbar() {
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_NAME);
  const [logo, setLogo] = useState<string | null>(null);

  const hasUnread = notificationCount > lastSeenCount;

  const loadSettings = async () => {
    try {
      // getSettings() is fast (~1 KB, no images)
      // getImages() is separate so it doesn't block school name / theme
      const [s, imgs] = await Promise.all([
        settingsService.getSettings().catch(() => null),
        settingsService.getImages().catch(() => null),
      ]);
      if (s) setSchoolName(s.schoolName || DEFAULT_SCHOOL_NAME);
      if (imgs) setLogo(settingsService.resolveImageUrl(imgs.logo));
    } catch {
      // Keep defaults
    }
  };

  useEffect(() => {
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener("settingsUpdated", handler);
    return () => window.removeEventListener("settingsUpdated", handler);
  }, []);

  const navItems = [
    { href: "/home/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/home/students", label: "Students", icon: "👨‍🎓" },
    { href: "/home/teachers", label: "Teachers", icon: "🧑‍🏫" },
    { href: "/home/messages", label: "Messages", icon: "💬" },
    { href: "/home/history", label: "History", icon: "⏰" },
    { href: "/home/schedules", label: "Schedules", icon: "🗓️" },
    { href: "/home/reports", label: "Reports", icon: "📈" },
  ];

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(NOTIFICATION_LAST_SEEN_KEY)
        : null;
    if (stored !== null) {
      const n = parseInt(stored, 10);
      if (!Number.isNaN(n)) setLastSeenCount(n);
    }
  }, []);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const count = await notificationService.getNotificationCount();
        setNotificationCount(count);
        if (pathname === "/home/notifications") {
          setLastSeenCount(count);
          if (typeof window !== "undefined") {
            localStorage.setItem(NOTIFICATION_LAST_SEEN_KEY, String(count));
          }
        } else if (typeof window !== "undefined") {
          const stored = localStorage.getItem(NOTIFICATION_LAST_SEEN_KEY);
          if (stored !== null) {
            const n = parseInt(stored, 10);
            if (!Number.isNaN(n)) setLastSeenCount(n);
          }
        }
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 120000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="flex justify-between items-center navbar-row">
          {/* Logo & brand */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <Link
              href="/home/dashboard"
              className="flex items-center gap-2.5 min-w-0 group"
            >
              {logo && (
                <span className="navbar-logo-wrap">
                  <img
                    src={logo}
                    alt={`${schoolName} Logo`}
                    className="navbar-logo"
                  />
                </span>
              )}
              <span className="navbar-brand">{schoolName}</span>
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
                    className={`navbar-link ${isActive ? "navbar-link-active" : ""}`}
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    <span className="navbar-link-icon" aria-hidden>
                      {item.icon}
                    </span>
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
              aria-label={
                hasUnread
                  ? `${notificationCount} unread notifications`
                  : "Notifications"
              }
            >
              <Bell size={18} strokeWidth={2} />
              {hasUnread && (
                <span className="navbar-badge" aria-hidden>
                  {/* Red dot – disappears after notifications are viewed */}
                </span>
              )}
            </Link>

            <Link
              href="/home/settings"
              className="navbar-action"
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={18} strokeWidth={2} />
            </Link>

            <ThemeToggle />

            <div className="hidden md:block">
              <Link href="/logout" className="navbar-logout">
                <span aria-hidden>🚪</span>
                Logout
              </Link>
            </div>

            <div className="md:hidden">
              <button type="button" className="navbar-action" aria-label="Menu">
                <span className="text-lg">☰</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
