'use client';

interface ViewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: {
    id: string;
    gradeLevel: string;
    section: string;
    subject: string;
    teacher: string;
    timeSlot: string;
    room: string;
    day: string;
  } | null;
}

export default function ViewScheduleModal({ isOpen, onClose, schedule }: ViewScheduleModalProps) {
  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-2xl w-full mx-4 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Schedule Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Schedule ID</p>
              <p className="text-base font-medium text-gray-900">{schedule.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Subject</p>
              <p className="text-base font-medium text-gray-900">{schedule.subject}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Grade Level</p>
              <p className="text-base font-medium text-gray-900">{schedule.gradeLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Section</p>
              <p className="text-base font-medium text-gray-900">{schedule.section}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Teacher</p>
              <p className="text-base font-medium text-gray-900">{schedule.teacher}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Room</p>
              <p className="text-base font-medium text-gray-900">{schedule.room}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Day</p>
              <p className="text-base font-medium text-gray-900">{schedule.day}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time Slot</p>
              <p className="text-base font-medium text-gray-900">{schedule.timeSlot}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}