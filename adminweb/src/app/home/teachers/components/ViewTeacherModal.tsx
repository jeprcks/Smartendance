'use client';

interface ViewTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: {
    teacherId: string;
    name: string;
    role: string;
    subject: string;
    email: string;
    phoneNumber: string;
    dateJoined: string;
    status: string;
    profilePicture?: string;
    gender?: string;
    password?: string;
    plainPassword?: string;
    address?: {
      street?: string;
      city?: string;
      province?: string;
      zipCode?: string;
    };
  } | null;
}

export default function ViewTeacherModal({ isOpen, onClose, teacher }: ViewTeacherModalProps) {
  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex justify-end mb-4">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-8">
          {/* Profile Photo Section */}
          <div className="flex justify-center">
            <div className="relative">
              {teacher.profilePicture ? (
                <img
                  src={teacher.profilePicture}
                  alt={`${teacher.name}'s profile`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Teacher ID</p>
                <p className="text-base text-gray-900">{teacher.teacherId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-base text-gray-900">{teacher.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-base text-gray-900">{teacher.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="text-base text-gray-900">{teacher.subject}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className={`text-base font-medium ${teacher.gender === 'Male' ? 'text-blue-700' : teacher.gender === 'Female' ? 'text-pink-700' : 'text-gray-900'}`}>{teacher.gender || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`text-base ${
                  teacher.status === 'Active' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {teacher.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-base text-gray-900">{teacher.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Password</p>
                <p className="text-base text-gray-900 font-mono">{(teacher as any).plainPassword || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="text-base text-gray-900">{teacher.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teacher.address?.street && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Street Address</p>
                  <p className="text-base text-gray-900">{teacher.address.street}</p>
                </div>
              )}
              {teacher.address?.city && (
                <div>
                  <p className="text-sm text-gray-500">City/Municipality</p>
                  <p className="text-base text-gray-900">{teacher.address.city}</p>
                </div>
              )}
              {teacher.address?.province && (
                <div>
                  <p className="text-sm text-gray-500">Province</p>
                  <p className="text-base text-gray-900">{teacher.address.province}</p>
                </div>
              )}
              {teacher.address?.zipCode && (
                <div>
                  <p className="text-sm text-gray-500">ZIP Code</p>
                  <p className="text-base text-gray-900">{teacher.address.zipCode}</p>
                </div>
              )}
              {!teacher.address?.street && !teacher.address?.city && !teacher.address?.province && !teacher.address?.zipCode && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-base text-gray-500 italic">No address information provided</p>
                </div>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Date Joined</p>
                <p className="text-base text-gray-900">{new Date(teacher.dateJoined).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}