'use client';

import { useEffect, useState } from 'react';
import { notificationService, Notification, NotificationStats } from '@/app/services/notificationService';
import { format, formatDistanceToNow } from 'date-fns';
import LoadingSkeleton from '@/app/components/loading/LoadingSkeleton';
import { Bell, AlertTriangle, Clock, XCircle, Scissors, RefreshCw, Scan } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    late: 0,
    absent: 0,
    cutting: 0,
    noTimeOut: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'late' | 'absent' | 'cutting' | 'no_time_out'>('all');

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await notificationService.getNotifications(30);
      
      if (result.success) {
        setNotifications(result.notifications);
        setStats(result.stats);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 300000);
    return () => clearInterval(interval);
  }, []);

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'late':
        return <Clock className="text-yellow-600" size={20} />;
      case 'absent':
        return <XCircle className="text-red-600" size={20} />;
      case 'cutting':
        return <Scissors className="text-orange-600" size={20} />;
      case 'no_time_out':
        return <Scan className="text-violet-600" size={20} />;
      default:
        return <Bell className="text-gray-600" size={20} />;
    }
  };

  const getNotificationColor = (type: string, severity: string) => {
    if (severity === 'critical') {
      return 'border-red-500 bg-red-50';
    }
    switch (type) {
      case 'late':
        return 'border-yellow-500 bg-yellow-50';
      case 'absent':
        return 'border-red-500 bg-red-50';
      case 'cutting':
        return 'border-orange-500 bg-orange-50';
      case 'no_time_out':
        return 'border-violet-500 bg-violet-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getStatusBadge = (type: string) => {
    const badges = {
      late: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Late' },
      absent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' },
      cutting: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Cutting' },
      no_time_out: { bg: 'bg-violet-100', text: 'text-violet-800', label: 'No Time Out' },
    };
    const badge = badges[type as keyof typeof badges] || badges.late;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Notifications</h1>
            <p>Consecutive late/absent/cutting and abnormal scanning (scanned in but no time out)</p>
          </div>
          <div className="dashboard-header-refresh-box">
            <button
              type="button"
              onClick={fetchNotifications}
              disabled={isLoading}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className={isLoading ? 'animate-spin' : ''} size={16} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="dashboard-grid mb-8">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Bell className="text-green-700" size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Notifications</p>
              <p className="text-3xl font-bold text-green-700">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="text-yellow-700" size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Consecutive Late</p>
              <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="text-red-700" size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Consecutive Absent</p>
              <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Scissors className="text-orange-700" size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Consecutive Cutting</p>
              <p className="text-3xl font-bold text-orange-700">{stats.cutting}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-violet-50 rounded-lg">
              <Scan className="text-violet-700" size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">No Time Out (Abnormal)</p>
              <p className="text-3xl font-bold text-violet-700">{stats.noTimeOut}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-[var(--radius)] font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
              : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setFilter('late')}
          className={`px-4 py-2 rounded-[var(--radius)] font-medium transition-colors ${
            filter === 'late'
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
              : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'
          }`}
        >
          Late ({stats.late})
        </button>
        <button
          type="button"
          onClick={() => setFilter('absent')}
          className={`px-4 py-2 rounded-[var(--radius)] font-medium transition-colors ${
            filter === 'absent'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'
          }`}
        >
          Absent ({stats.absent})
        </button>
        <button
          type="button"
          onClick={() => setFilter('cutting')}
          className={`px-4 py-2 rounded-[var(--radius)] font-medium transition-colors ${
            filter === 'cutting'
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'
          }`}
        >
          Cutting ({stats.cutting})
        </button>
        <button
          type="button"
          onClick={() => setFilter('no_time_out')}
          className={`px-4 py-2 rounded-[var(--radius)] font-medium transition-colors ${
            filter === 'no_time_out'
              ? 'bg-violet-500 text-white hover:bg-violet-600'
              : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'
          }`}
        >
          No Time Out ({stats.noTimeOut})
        </button>
      </div>

      {/* Notifications List */}
      <div className="content-section">
        {isLoading ? (
          <LoadingSkeleton type="card" count={5} />
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <Bell className="mx-auto mb-4 text-[var(--muted-foreground)]" size={48} />
            <p className="text-lg font-medium text-[var(--foreground)]">No notifications</p>
            <p className="text-sm mt-2">
              {filter === 'all'
                ? 'No notifications (consecutive late/absent/cutting or no time out)'
                : filter === 'no_time_out'
                  ? 'No students who scanned in but did not scan out'
                  : `No students with 3+ consecutive days of ${filter}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 rounded-[var(--radius)] border-l-4 ${getNotificationColor(notification.type, notification.severity)} shadow-sm hover:shadow-md transition-shadow border border-[var(--border)]`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">
                          {notification.studentName}
                        </h3>
                        {getStatusBadge(notification.type)}
                        {notification.severity === 'critical' && (
                          <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-semibold">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--foreground)]/90 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] flex-wrap">
                        <span>
                          {notification.gradeLevel} - {notification.section}
                        </span>
                        <span>•</span>
                        {notification.type === 'no_time_out' ? (
                          <span>
                            Scanned in: {format(new Date(notification.lastOccurrence), 'MMM dd, yyyy, h:mm a')} ({formatDistanceToNow(new Date(notification.lastOccurrence), { addSuffix: true })})
                          </span>
                        ) : (
                          <>
                            <span>
                              {notification.consecutiveCount} consecutive {notification.consecutiveCount === 1 ? 'day' : 'days'}
                            </span>
                            <span>•</span>
                            <span>
                              Last: {format(new Date(notification.lastOccurrence), 'MMM dd, yyyy')} ({formatDistanceToNow(new Date(notification.lastOccurrence), { addSuffix: true })})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/home/history?studentId=${notification.studentId}`}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--radius)] hover:bg-[var(--primary-dark)] transition-colors text-sm font-medium inline-flex flex-shrink-0"
                  >
                    View History
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
