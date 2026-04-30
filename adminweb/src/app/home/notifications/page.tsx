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
    unscanned: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSilentRefresh, setIsSilentRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'late' | 'absent' | 'cutting' | 'no_time_out' | 'unscanned'>('all');
  const [timePeriod, setTimePeriod] = useState<'7days' | '1month' | 'all'>('7days');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsSilentRefresh(true);
      }
      setError(null);
      
      // Calculate days to check based on time period
      let daysToCheck = 7;
      if (timePeriod === '1month') {
        daysToCheck = 30;
      } else if (timePeriod === 'all') {
        daysToCheck = 365; // Full year
      }
      
      const result = await notificationService.getNotifications(daysToCheck);
      
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
      setIsSilentRefresh(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 10 seconds (silent) for near real-time notification updates
    const interval = setInterval(() => fetchNotifications(true), 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [timePeriod]);

  const filteredNotifications = (filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter))
  .filter(n => {
    // Search filter by student name, grade level, section, or message
    const query = searchQuery.toLowerCase();
    return (
      (n.studentName || '').toLowerCase().includes(query) ||
      (n.gradeLevel || '').toLowerCase().includes(query) ||
      (n.section || '').toLowerCase().includes(query) ||
      (n.message || '').toLowerCase().includes(query)
    );
  });

  const getNotificationIcon = (type: string) => {
    const iconStyles = {
      late: { color: 'var(--accent-yellow)' },
      absent: { color: 'var(--accent-red)' },
      cutting: { color: 'var(--accent-orange)' },
      no_time_out: { color: 'var(--accent-purple)' },
      unscanned: { color: 'var(--accent-blue)' },
    };
    const style = iconStyles[type as keyof typeof iconStyles] || { color: 'var(--foreground)' };
    
    switch (type) {
      case 'late':
        return <Clock style={style} size={20} />;
      case 'absent':
        return <XCircle style={style} size={20} />;
      case 'cutting':
        return <Scissors style={style} size={20} />;
      case 'no_time_out':
        return <Scan style={style} size={20} />;
      case 'unscanned':
        return <Bell style={style} size={20} />;
      default:
        return <Bell style={style} size={20} />;
    }
  };

  const getNotificationColor = (type: string, severity: string) => {
    if (severity === 'critical') {
      return 'border-l-4';
    }
    return 'border-l-4';
  };

  const getStatusBadge = (type: string) => {
    const badgeStyles = {
      late: { bg: 'var(--accent-yellow-bg)', color: 'var(--accent-yellow)', label: 'Late' },
      absent: { bg: 'var(--accent-red-bg)', color: 'var(--accent-red)', label: 'Absent' },
      cutting: { bg: 'var(--accent-orange-bg)', color: 'var(--accent-orange)', label: 'Cutting' },
      no_time_out: { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)', label: 'No Time Out' },
      unscanned: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', label: 'Unscanned' },
    };
    const badge = badgeStyles[type as keyof typeof badgeStyles] || badgeStyles.late;
    return (
      <span 
        style={{ 
          backgroundColor: badge.bg,
          color: badge.color,
        }}
        className="px-2 py-1 rounded-full text-xs font-semibold"
      >
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
              onClick={() => fetchNotifications(false)}
              disabled={isLoading || isSilentRefresh}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className={isLoading || isSilentRefresh ? 'animate-spin' : ''} size={16} />
              {isLoading ? 'Refreshing...' : isSilentRefresh ? 'Updating...' : 'Refresh'}
            </button>
            {isSilentRefresh && (
              <span className="text-white/90 text-xs animate-pulse">🔄 Live</span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg border flex items-center gap-2" style={{ backgroundColor: 'var(--accent-red-bg)', borderColor: 'var(--accent-red)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--accent-red)' }} />
          <p style={{ color: 'var(--accent-red)' }}>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="dashboard-grid mb-8">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-green-bg)' }}>
              <Bell size={24} style={{ color: 'var(--accent-green)' }} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Notifications</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-yellow-bg)' }}>
              <Clock size={24} style={{ color: 'var(--accent-yellow)' }} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Consecutive Late</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-yellow)' }}>{stats.late}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-red-bg)' }}>
              <XCircle size={24} style={{ color: 'var(--accent-red)' }} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Consecutive Absent</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{stats.absent}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-orange-bg)' }}>
              <Scissors size={24} style={{ color: 'var(--accent-orange)' }} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Consecutive Cutting</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-orange)' }}>{stats.cutting}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-purple-bg)' }}>
              <Scan size={24} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">No Time Out (Abnormal)</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-purple)' }}>{stats.noTimeOut}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-blue-bg)' }}>
              <Bell size={24} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Unscanned</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>{stats.unscanned}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--foreground)] mb-3">Time Period</p>
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTimePeriod('7days')}
            style={{
              backgroundColor: timePeriod === '7days' ? 'var(--primary)' : 'var(--muted)',
              color: timePeriod === '7days' ? 'white' : 'var(--foreground)',
              borderColor: 'var(--border)',
            }}
            className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod('1month')}
            style={{
              backgroundColor: timePeriod === '1month' ? 'var(--primary)' : 'var(--muted)',
              color: timePeriod === '1month' ? 'white' : 'var(--foreground)',
              borderColor: 'var(--border)',
            }}
            className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
          >
            Last 1 Month
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod('all')}
            style={{
              backgroundColor: timePeriod === 'all' ? 'var(--primary)' : 'var(--muted)',
              color: timePeriod === 'all' ? 'white' : 'var(--foreground)',
              borderColor: 'var(--border)',
            }}
            className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
          >
            All Time
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by student name, grade level, section, or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            backgroundColor: 'var(--muted)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
          className="w-full px-4 py-2 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
        />
      </div>

      {/* Notification Type Filter */}
      <div className="mb-6\">
        <p className="text-sm font-medium text-[var(--foreground)] mb-3\">Notification Type</p>
        <div className="flex flex-wrap gap-2\">
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            backgroundColor: filter === 'all' ? 'var(--primary)' : 'var(--muted)',
            color: filter === 'all' ? 'white' : 'var(--foreground)',
            borderColor: 'var(--border)',
          }}
          className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
        >
          All ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setFilter('late')}
          style={{
            backgroundColor: filter === 'late' ? 'var(--accent-yellow-bg)' : 'var(--muted)',
            color: filter === 'late' ? 'var(--accent-yellow)' : 'var(--foreground)',
            borderColor: 'var(--border)',
          }}
          className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
        >
          Late ({stats.late})
        </button>
        <button
          type="button"
          onClick={() => setFilter('absent')}
          style={{
            backgroundColor: filter === 'absent' ? 'var(--accent-red-bg)' : 'var(--muted)',
            color: filter === 'absent' ? 'var(--accent-red)' : 'var(--foreground)',
            borderColor: 'var(--border)',
          }}
          className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
        >
          Absent ({stats.absent})
        </button>
        <button
          type="button"
          onClick={() => setFilter('cutting')}
          style={{
            backgroundColor: filter === 'cutting' ? 'var(--accent-orange-bg)' : 'var(--muted)',
            color: filter === 'cutting' ? 'var(--accent-orange)' : 'var(--foreground)',
            borderColor: 'var(--border)',
          }}
          className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
        >
          Cutting ({stats.cutting})
        </button>
        <button
          type="button"
          onClick={() => setFilter('no_time_out')}
          style={{
            backgroundColor: filter === 'no_time_out' ? 'var(--accent-purple-bg)' : 'var(--muted)',
            color: filter === 'no_time_out' ? 'var(--accent-purple)' : 'var(--foreground)',
            borderColor: 'var(--border)',
          }}
          className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
        >
          No Time Out ({stats.noTimeOut})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unscanned')}
          style={{
            backgroundColor: filter === 'unscanned' ? 'var(--accent-blue-bg)' : 'var(--muted)',
            color: filter === 'unscanned' ? 'var(--accent-blue)' : 'var(--foreground)',
            borderColor: 'var(--border)',
          }}
          className="px-4 py-2 rounded-[var(--radius)] font-medium transition-colors border"
        >
          Unscanned ({stats.unscanned})
        </button>
        </div>
      </div>
      {/* End of Notification Type Filter */}

      {/* Notifications List */}
      <div className="content-section">
        {isLoading ? (
          <LoadingSkeleton type="card" count={5} />
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <Bell className="mx-auto mb-4 text-[var(--muted-foreground)]" size={48} />
            <p className="text-lg font-medium text-[var(--foreground)]">No notifications</p>
            <p className="text-sm mt-2">
              {searchQuery
                ? `No results matching "${searchQuery}"`
                : filter === 'all'
                ? `No notifications in the last ${timePeriod === '7days' ? '7 days' : timePeriod === '1month' ? '1 month' : 'year'}`
                : filter === 'no_time_out'
                  ? `No students who scanned in but did not scan out in the last ${timePeriod === '7days' ? '7 days' : timePeriod === '1month' ? '1 month' : 'year'}`
                  : `No students with 3+ consecutive days of ${filter} in the last ${timePeriod === '7days' ? '7 days' : timePeriod === '1month' ? '1 month' : 'year'}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              let borderColor = 'var(--border)';
              let bgColor = 'var(--surface)';
              
              if (notification.severity === 'critical') {
                borderColor = 'var(--accent-red)';
                bgColor = 'var(--accent-red-bg)';
              } else {
                switch (notification.type) {
                  case 'late':
                    borderColor = 'var(--accent-yellow)';
                    bgColor = 'var(--accent-yellow-bg)';
                    break;
                  case 'absent':
                    borderColor = 'var(--accent-red)';
                    bgColor = 'var(--accent-red-bg)';
                    break;
                  case 'cutting':
                    borderColor = 'var(--accent-orange)';
                    bgColor = 'var(--accent-orange-bg)';
                    break;
                  case 'no_time_out':
                    borderColor = 'var(--accent-purple)';
                    bgColor = 'var(--accent-purple-bg)';
                    break;
                  case 'unscanned':
                    borderColor = 'var(--accent-blue)';
                    bgColor = 'var(--accent-blue-bg)';
                    break;
                }
              }
              
              return (
              <div
                key={notification.id}
                style={{
                  backgroundColor: bgColor,
                  borderLeftColor: borderColor,
                  borderColor: 'var(--border)',
                }}
                className="p-6 rounded-[var(--radius)] border-l-4 border shadow-sm hover:shadow-md transition-shadow"
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
                          <span style={{ backgroundColor: 'var(--accent-red)', color: 'white' }} className="px-2 py-1 rounded-full text-xs font-semibold">
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
                        ) : notification.type === 'unscanned' ? (
                          <span>
                            Not scanned: {formatDistanceToNow(new Date(notification.lastOccurrence), { addSuffix: true })}
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
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                    }}
                    className="px-4 py-2 rounded-[var(--radius)] transition-colors text-sm font-medium inline-flex flex-shrink-0 hover:opacity-90"
                  >
                    View History
                  </Link>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
