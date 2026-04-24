'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getTeacherData } from '@/lib/auth';
import { getTeacherSchedule } from '../../../lib/api';
import PageHeader from '@/components/PageHeader';

const ScheduleIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, unknown>[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherId || !data.teacherName) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const list = await getTeacherSchedule({
        token,
        teacherId: data.teacherId,
        teacherName: data.teacherName,
      });
      const sorted = [...list].sort((a, b) => {
        const da = DAYS.indexOf(String(a.day ?? (Array.isArray(a.days) ? a.days[0] : '')));
        const db = DAYS.indexOf(String(b.day ?? (Array.isArray(b.days) ? b.days[0] : '')));
        if (da !== db) return da - db;
        const ta = String(a.timeSlot ?? '');
        const tb = String(b.timeSlot ?? '');
        return ta.localeCompare(tb);
      });
      setSchedules(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getScheduleDays = (s: Record<string, unknown>): string[] => {
    const d = s.days;
    if (Array.isArray(d)) return d;
    if (s.day) return [String(s.day)];
    return [];
  };

  const filtered = selectedDay
    ? schedules.filter((s) => getScheduleDays(s).includes(selectedDay))
    : schedules;

  const byDay: Record<string, Record<string, unknown>[]> = {};
  for (const s of filtered) {
    const days = getScheduleDays(s);
    for (const d of days) {
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(s);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Loading schedules...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="p-6 rounded-xl border bg-red-50" style={{ borderColor: 'var(--error)' }}>
          <p className="text-base font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-6 py-3 rounded-xl text-white btn-primary transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" icon={<ScheduleIcon />} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedDay(null)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 ${
            !selectedDay ? 'text-white shadow-lg' : ''
          }`}
          style={{
            background: !selectedDay ? 'var(--primary)' : 'var(--secondary)',
            color: !selectedDay ? 'white' : 'var(--primary-dark)',
            fontWeight: !selectedDay ? '600' : '500',
          }}
        >
          All
        </button>
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSelectedDay(d)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 ${
              selectedDay === d ? 'text-white shadow-lg' : ''
            }`}
            style={{
              background: selectedDay === d ? 'var(--primary)' : 'var(--secondary)',
              color: selectedDay === d ? 'white' : 'var(--primary-dark)',
              fontWeight: selectedDay === d ? '600' : '500',
            }}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-color-mix(in srgb, var(--muted) 70%, var(--primary) 30%) flex items-center justify-center">
            <ScheduleIcon />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--muted-foreground)' }}>
            No schedules found
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(byDay)
              .sort(([a], [b]) => DAYS.indexOf(a) - DAYS.indexOf(b))
              .map(([day, list]) => (
                <div key={day} className="animate-fade-in-up">
                  <h2 
                    className="text-xl font-bold mb-4 flex items-center gap-2" 
                    style={{ 
                      color: 'var(--primary-dark)',
                      textShadow: '0 1px 2px rgba(46, 125, 50, 0.1)',
                    }}
                  >
                    <span className="w-1 h-6 rounded-full" style={{ background: 'var(--primary)' }}></span>
                    {day}
                  </h2>
                  <div className="space-y-3">
                    {list
                      .sort((a, b) =>
                        String(a.timeSlot ?? '').localeCompare(
                          String(b.timeSlot ?? '')
                        )
                      )
                      .map((s, i) => (
                        <Link
                          key={i}
                          href={`/schedule/${s._id ?? s.id ?? i}`}
                          className="block p-5 rounded-xl border card-theme transition-all hover:border-[var(--primary)] schedule-card"
                        >
                          <p 
                            className="text-lg font-bold mb-2" 
                            style={{ 
                              color: 'var(--primary-dark)',
                              letterSpacing: '0.01em',
                            }}
                          >
                            {String(s.subject ?? 'N/A')}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <span 
                              className="text-sm font-semibold px-2 py-0.5 rounded-md" 
                              style={{ 
                                background: 'rgba(46, 125, 50, 0.1)',
                                color: 'var(--primary-dark)',
                              }}
                            >
                              {String(s.gradeLevel ?? '')}-{String(s.section ?? '')}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                              {String(s.shift ?? '')}
                            </span>
                          </div>
                          <p 
                            className="text-sm font-semibold flex items-center gap-1.5" 
                            style={{ color: 'var(--primary)' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {String(s.timeSlot ?? '')}
                          </p>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
