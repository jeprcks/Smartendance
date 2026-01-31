'use client';

import { useState, useEffect } from 'react';
import { teacherService, type Teacher } from '@/app/services/teacherService';
import { scheduleService, type Schedule } from '@/app/services/scheduleService';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (scheduleData: ScheduleFormData) => void;
  existingSchedules?: Schedule[];
}

interface ScheduleFormData {
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: string;
  timeSlot: string;
  room: string;
  days: string[]; // multi-day support
  shift: string;
}

export default function AddScheduleModal({ isOpen, onClose, onAdd, existingSchedules = [] }: AddScheduleModalProps) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    gradeLevel: '',
    section: '',
    subject: '',
    teacher: '',
    timeSlot: '',
    room: '',
    days: [],
    shift: '',
  });

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch teachers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTeachers();
    }
  }, [isOpen]);

  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      setTeacherError(null);
      const response = await teacherService.getAllTeachers({ 
        status: 'Active',
        limit: 100 
      });
      setTeachers(response.teachers);
    } catch (error) {
      setTeacherError(error instanceof Error ? error.message : 'Failed to load teachers');
      console.error('Error fetching teachers:', error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  const subjects = ['Mathematics', 'English', 'Science', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSchedule();
  };

  const submitSchedule = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Validate all fields are filled
      if (
        !formData.gradeLevel ||
        !formData.section ||
        !formData.subject ||
        !formData.teacher ||
        !formData.timeSlot ||
        !formData.room ||
        formData.days.length === 0 ||
        !formData.shift
      ) {
        setSubmitError('Please fill in all fields');
        return;
      }

      // Validate no overlapping: same section (gradeLevel + section) cannot have same timeSlot and same day
      const conflictingDays: string[] = [];
      for (const existing of existingSchedules) {
        const existingDays = existing.days?.length
          ? existing.days
          : existing.day
            ? [existing.day]
            : [];
        const sameSection =
          existing.gradeLevel === formData.gradeLevel &&
          existing.section === formData.section &&
          existing.timeSlot === formData.timeSlot &&
          existing.shift === formData.shift;
        if (sameSection) {
          const existingDaySet = new Set(existingDays as string[]);
          for (const d of formData.days) {
            if (existingDaySet.has(d)) {
              if (!conflictingDays.includes(d)) conflictingDays.push(d);
            }
          }
        }
      }
      if (conflictingDays.length > 0) {
        setSubmitError(
          `This section (${formData.gradeLevel} - ${formData.section}) already has a schedule for ${conflictingDays.join(', ')} at ${formData.timeSlot}. Please choose different days or time slot.`
        );
        return;
      }

      // Call the schedule service to create the schedule
      const newSchedule = await scheduleService.createSchedule({
        gradeLevel: formData.gradeLevel as 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6',
        section: formData.section,
        subject: formData.subject,
        teacher: formData.teacher,
        timeSlot: formData.timeSlot,
        room: formData.room,
        day: undefined,
        days: formData.days as ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[],
        shift: formData.shift as 'Morning' | 'Afternoon',
      });

      // Call the parent onAdd callback
      onAdd(formData);

      // Reset form and close modal
      setFormData({
        gradeLevel: '',
        section: '',
        subject: '',
        teacher: '',
        timeSlot: '',
        room: '',
        days: [],
        shift: '',
      });

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add schedule';
      setSubmitError(errorMessage);
      console.error('Error submitting schedule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.days.includes(day);
      return {
        ...prev,
        days: exists ? prev.days.filter((d) => d !== day) : [...prev.days, day],
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Schedule</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
              </label>
              <select
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select Grade Level</option>
                {gradeLevels.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="Enter section (e.g., A, B, C)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher
            </label>
            <select
              name="teacher"
              value={formData.teacher}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
              disabled={loadingTeachers}
            >
              <option value="">
                {loadingTeachers ? 'Loading teachers...' : 'Select Teacher'}
              </option>
              {teacherError && (
                <option disabled>{`Error: ${teacherError}`}</option>
              )}
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher.name}>
                  {teacher.name}
                </option>
              ))}
            </select>
            {teachers.length === 0 && !loadingTeachers && !teacherError && (
              <p className="text-xs text-gray-500 mt-1">No active teachers available</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days (select one or more)
              </label>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => {
                  const isSelected = formData.days.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                        isSelected
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {formData.days.length === 0 && submitError && (
                <p className="mt-1 text-sm text-red-600">Please select at least one day</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Slot
              </label>
              <input
                type="text"
                name="timeSlot"
                list="timeSlots"
                value={formData.timeSlot}
                onChange={handleChange}
                placeholder="Enter time slot (e.g., 7:00 AM - 8:00 AM) or choose from suggestions"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <datalist id="timeSlots">
                {timeSlots.map((time) => (
                  <option key={time} value={time} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room
            </label>
            <input
              type="text"
              name="room"
              value={formData.room}
              onChange={handleChange}
              placeholder="Enter room number"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift
            </label>
            <select
              name="shift"
              value={formData.shift}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">Select Shift</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
