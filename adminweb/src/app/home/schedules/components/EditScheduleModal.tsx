 'use client';

import { useEffect, useState } from 'react';
import { scheduleService, type Schedule } from '@/app/services/scheduleService';
import { teacherService, type Teacher } from '@/app/services/teacherService';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onEdit: (updated: Schedule) => void;
  existingSchedules?: Schedule[];
}

const gradeLevels = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];
const subjects = ['Mathematics','English','Science','Filipino','Social Studies','Physical Education','Values Education'];
const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const timeSlots = [
  '7:00 AM - 8:00 AM',
  '8:00 AM - 9:00 AM',
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '1:00 PM - 2:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM'
];

export default function EditScheduleModal({ isOpen, onClose, schedule, onEdit, existingSchedules = [] }: EditScheduleModalProps) {
  const [form, setForm] = useState({
    gradeLevel: '',
    section: '',
    subject: '',
    teacher: '',
    timeSlot: '',
    room: '',
    days: [] as string[],
    shift: '' as 'Morning' | 'Afternoon' | ''
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      setForm({
        gradeLevel: schedule.gradeLevel || '',
        section: schedule.section || '',
        subject: schedule.subject || '',
        teacher: schedule.teacher || '',
        timeSlot: schedule.timeSlot || '',
        room: schedule.room || '',
        days: Array.isArray(schedule.days) && schedule.days.length > 0 ? schedule.days : (schedule.day ? [schedule.day] : []),
        shift: schedule.shift || ''
      });
    }
  }, [schedule]);

  useEffect(() => {
    if (isOpen) fetchTeachers();
  }, [isOpen]);

  async function fetchTeachers() {
    try {
      setLoadingTeachers(true);
      const res = await teacherService.getAllTeachers({ status: 'Active', limit: 200 });
      setTeachers(res.teachers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeachers(false);
    }
  }

  const toggleDay = (day: string) => {
    setForm(prev => {
      const exists = prev.days.includes(day);
      return { ...prev, days: exists ? prev.days.filter(d => d !== day) : [...prev.days, day] };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule?._id) return;
    if (!form.gradeLevel || !form.section || !form.subject || !form.teacher || !form.timeSlot || form.days.length === 0 || !form.shift) {
      setError('Please fill in all required fields (including at least one day).');
      return;
    }

    // Validate no overlapping: same section cannot have same timeSlot and same day (exclude current schedule)
    const others = existingSchedules.filter(s => s._id !== schedule._id);
    const conflictingDays: string[] = [];
    for (const existing of others) {
      const existingDays = existing.days?.length
        ? existing.days
        : existing.day
          ? [existing.day]
          : [];
      const sameSection =
        existing.gradeLevel === form.gradeLevel &&
        existing.section === form.section &&
        existing.timeSlot === form.timeSlot &&
        existing.shift === form.shift;
      if (sameSection) {
        const existingDaySet = new Set(existingDays as string[]);
        for (const d of form.days) {
          if (existingDaySet.has(d)) {
            if (!conflictingDays.includes(d)) conflictingDays.push(d);
          }
        }
      }
    }
    if (conflictingDays.length > 0) {
      setError(
        `This section (${form.gradeLevel} - ${form.section}) already has a schedule for ${conflictingDays.join(', ')} at ${form.timeSlot}. Please choose different days or time slot.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload: Partial<Schedule> = {
        gradeLevel: form.gradeLevel as Schedule['gradeLevel'],
        section: form.section,
        subject: form.subject,
        teacher: form.teacher,
        timeSlot: form.timeSlot,
        room: form.room,
        days: form.days as Schedule['days'],
        day: form.days.length > 0 && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(form.days[0])
          ? form.days[0] as Schedule['day']
          : undefined,
        shift: form.shift as Schedule['shift']
      };

      const updated = await scheduleService.updateSchedule(schedule._id!, payload);
      onEdit(updated);
      onClose();
    } catch (err: any) {
      console.error('Error updating schedule:', err);
      setError(err?.message || 'Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50 z-40" />
      <div className="relative z-50 rounded-lg shadow-lg border p-6 max-w-2xl w-full mx-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Edit Schedule</h3>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }} className="hover:opacity-70">✕</button>
        </div>

        {error && <div className="mb-4 text-sm p-3 rounded" style={{ color: 'var(--accent-red)', backgroundColor: 'var(--accent-red-bg)' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Grade Level</label>
              <select name="gradeLevel" value={form.gradeLevel} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="">Select Grade</option>
                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Section</label>
              <input name="section" value={form.section} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Subject</label>
              <select name="subject" value={form.subject} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Teacher</label>
              <select name="teacher" value={form.teacher} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} disabled={loadingTeachers}>
                <option value="">{loadingTeachers ? 'Loading...' : 'Select Teacher'}</option>
                {teachers.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Days (select one or more)</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(d => {
                  const isSelected = form.days.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)} className="px-3 py-1 rounded border transition-colors" style={{ 
                      backgroundColor: isSelected ? 'var(--accent-green-bg)' : 'var(--muted)',
                      color: isSelected ? 'var(--accent-green)' : 'var(--foreground)',
                      borderColor: isSelected ? 'var(--accent-green)' : 'var(--border)'
                    }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Time Slot</label>
              <input list="timeSlots" name="timeSlot" value={form.timeSlot} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              <datalist id="timeSlots">{timeSlots.map(t => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Room</label>
              <input name="room" value={form.room} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Shift</label>
              <select name="shift" value={form.shift} onChange={handleChange} className="w-full p-2 border rounded" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="">Select Shift</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded font-medium transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--muted)' }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded font-medium text-white transition-colors" style={{ backgroundColor: 'var(--primary)' }}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

