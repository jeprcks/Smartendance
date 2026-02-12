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
} {
  if (typeof window === 'undefined') {
    return {
      token: null,
      teacherId: null,
      teacherName: null,
      teacherEmail: null,
      teacherSubject: null,
      teacherRole: null,
    };
  }
  return {
    token: localStorage.getItem(TEACHER_TOKEN),
    teacherId: localStorage.getItem(TEACHER_ID),
    teacherName: localStorage.getItem(TEACHER_NAME),
    teacherEmail: localStorage.getItem(TEACHER_EMAIL),
    teacherSubject: localStorage.getItem(TEACHER_SUBJECT),
    teacherRole: localStorage.getItem(TEACHER_ROLE),
  };
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TEACHER_TOKEN);
  localStorage.removeItem(TEACHER_ID);
  localStorage.removeItem(TEACHER_NAME);
  localStorage.removeItem(TEACHER_EMAIL);
  localStorage.removeItem(TEACHER_SUBJECT);
  localStorage.removeItem(TEACHER_ROLE);
  document.cookie = 'teacher_token=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT';
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return !!token && token.length > 0;
}
