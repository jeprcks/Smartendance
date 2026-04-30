'use client';

interface ViewTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: {
    teacherId: string;
    username?: string;
    name: string;
    role: string;
    subject?: string;
    subjects?: string[];
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
    <div className="fixed top-20 left-0 right-0 bottom-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true"></div>
      <div className="relative z-10 bg-[var(--surface)] rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-8 max-w-4xl w-full mx-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--primary-dark)]">Teacher Details</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-[var(--radius)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                  className="w-32 h-32 rounded-full object-cover border-4 border-[var(--border)]"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[var(--muted)] border-4 border-[var(--border)] flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-[var(--muted-foreground)]"
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
          <div className="space-y-4 p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="text-lg font-semibold text-[var(--primary-dark)]">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Teacher ID</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.teacherId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Full Name</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Username</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Password</p>
                <p className="text-base text-[var(--foreground)] font-mono mt-0.5">*******</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Role</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Subjects</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(Array.isArray(teacher.subjects) ? teacher.subjects : (teacher.subject ? [teacher.subject] : [])).map((sub) => (
                    <span key={sub} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--secondary)] text-[var(--secondary-foreground)]">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Gender</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.gender || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Status</p>
                <p className={`text-base font-medium mt-0.5 ${
                  teacher.status === 'Active' 
                    ? 'text-[var(--primary)]' 
                    : 'text-[var(--destructive)]'
                }`}>
                  {teacher.status}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Email Address</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.email}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="text-lg font-semibold text-[var(--primary-dark)]">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Phone Number</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="text-lg font-semibold text-[var(--primary-dark)]">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teacher.address?.street && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Street Address</p>
                  <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.address.street}</p>
                </div>
              )}
              {teacher.address?.city && (
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">City/Municipality</p>
                  <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.address.city}</p>
                </div>
              )}
              {teacher.address?.province && (
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Province</p>
                  <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.address.province}</p>
                </div>
              )}
              {teacher.address?.zipCode && (
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">ZIP Code</p>
                  <p className="text-base text-[var(--foreground)] mt-0.5">{teacher.address.zipCode}</p>
                </div>
              )}
              {!teacher.address?.street && !teacher.address?.city && !teacher.address?.province && !teacher.address?.zipCode && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Address</p>
                  <p className="text-base text-[var(--muted-foreground)] italic mt-0.5">No address information provided</p>
                </div>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4 p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="text-lg font-semibold text-[var(--primary-dark)]">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Date Joined</p>
                <p className="text-base text-[var(--foreground)] mt-0.5">{new Date(teacher.dateJoined).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="btn-primary px-6 py-2.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}