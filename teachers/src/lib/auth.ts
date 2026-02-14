/**
 * Teacher auth helpers - stores token and teacher data in localStorage
 * Keys match mobile authWrapper.dart
 */

const TEACHER_TOKEN = 'teacher_token';
const TEACHER_ID = 'teacher_id';
const TEACHER_NAME = 'teacher_name';
const TEACHER_EMAIL = 'teacher_email';
const TEACHER_SUBJECT = 'teacher_subject';
const TEACHER_ROLE = 'teacher_role';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TEACHER_TOKEN);
}

export function setTeacherAuth(data: {
  token: string;
  teacherId: string;
  teacherName: string;
  email: string;
  subject?: string;
  role?: string;
}): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEACHER_TOKEN, data.token);
  localStorage.setItem(TEACHER_ID, data.teacherId);
  localStorage.setItem(TEACHER_NAME, data.teacherName);
  localStorage.setItem(TEACHER_EMAIL, data.email);
  localStorage.setItem(TEACHER_SUBJECT, data.subject ?? '');
  localStorage.setItem(TEACHER_ROLE, data.role ?? 'Teacher');
  // Also set cookie for middleware (Secure only on HTTPS)
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https' ? ';Secure' : '';
  document.cookie = `teacher_token=${data.token};path=/;max-age=86400;SameSite=Lax${secure}`;
}

export function getTeacherData(): {
  token: string | null;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  teacherSubject: string | null;
  teacherRole: string | null;
  profilePicture: string | null;
} {
  if (typeof window === 'undefined') {
    return {
      token: null,
      teacherId: null,
      teacherName: null,
      teacherEmail: null,
      teacherSubject: null,
      teacherRole: null,
      profilePicture: null,
    };
  }
  return {
    token: localStorage.getItem(TEACHER_TOKEN),
    teacherId: localStorage.getItem(TEACHER_ID),
    teacherName: localStorage.getItem(TEACHER_NAME),
    teacherEmail: localStorage.getItem(TEACHER_EMAIL),
    teacherSubject: localStorage.getItem(TEACHER_SUBJECT),
    teacherRole: localStorage.getItem(TEACHER_ROLE),
    profilePicture: localStorage.getItem('teacher_profile_picture'),
  };
}

/** Update only display data in localStorage (e.g. after profile edit). Dispatches 'teacher-profile-updated' so layout/sidebar can refresh. */
export function updateTeacherDisplay(updates: {
  teacherName?: string;
  teacherEmail?: string;
  teacherSubject?: string;
  profilePicture?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  if (updates.teacherName !== undefined) localStorage.setItem(TEACHER_NAME, updates.teacherName);
  if (updates.teacherEmail !== undefined) localStorage.setItem(TEACHER_EMAIL, updates.teacherEmail);
  if (updates.teacherSubject !== undefined) localStorage.setItem(TEACHER_SUBJECT, updates.teacherSubject);
  if (updates.profilePicture !== undefined) {
    if (updates.profilePicture === null || updates.profilePicture === '') {
          localStorage.removeItem('teacher_profile_picture');
        } else {
          localStorage.setItem('teacher_profile_picture', updates.profilePicture);
        }
  }
  window.dispatchEvent(new CustomEvent('teacher-profile-updated'));
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TEACHER_TOKEN);
  localStorage.removeItem(TEACHER_ID);
  localStorage.removeItem(TEACHER_NAME);
  localStorage.removeItem(TEACHER_EMAIL);
  localStorage.removeItem(TEACHER_SUBJECT);
  localStorage.removeItem(TEACHER_ROLE);
  localStorage.removeItem('teacher_profile_picture');
  document.cookie = 'teacher_token=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT';
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return !!token && token.length > 0;
}
