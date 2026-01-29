 'use client';

import { useEffect, useState } from 'react';
import { scheduleService, type Schedule } from '@/app/services/scheduleService';
import { teacherService, type Teacher } from '@/app/services/teacherService';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onEdit: (updated: Schedule) => void;
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

export default function EditScheduleModal({ isOpen, onClose, schedule, onEdit }: EditScheduleModalProps) {
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
        days: form.days as any,
        day: form.days.length > 0 ? form.days[0] : undefined,
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
      <div className="relative z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Edit Schedule</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
              <select name="gradeLevel" value={form.gradeLevel} onChange={handleChange} className="w-full p-2 border rounded">
                <option value="">Select Grade</option>
                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <input name="section" value={form.section} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select name="subject" value={form.subject} onChange={handleChange} className="w-full p-2 border rounded">
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <select name="teacher" value={form.teacher} onChange={handleChange} className="w-full p-2 border rounded" disabled={loadingTeachers}>
                <option value="">{loadingTeachers ? 'Loading...' : 'Select Teacher'}</option>
                {teachers.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days (select one or more)</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(d => {
                  const isSelected = form.days.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)} className={`px-3 py-1 rounded ${isSelected ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
              <input list="timeSlots" name="timeSlot" value={form.timeSlot} onChange={handleChange} className="w-full p-2 border rounded" />
              <datalist id="timeSlots">{timeSlots.map(t => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <input name="room" value={form.room} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select name="shift" value={form.shift} onChange={handleChange} className="w-full p-2 border rounded">
                <option value="">Select Shift</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

