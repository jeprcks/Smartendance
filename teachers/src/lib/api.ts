/**
 * Teacher API - mirrors mobile teacherService.dart
 * Uses NEXT_PUBLIC_API_URL for base URL (fallback: http://localhost:4000)
 */

function getApiBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
      : '';

  if (envUrl) return envUrl;

  if (typeof window !== 'undefined') {
    const o = window.location.origin;
    if (o && !o.includes('localhost')) return o;
  }

  return 'http://localhost:4000';
}

const API_BASE = `${getApiBaseUrl()}/api`;

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Teacher login - POST /api/auth/teacher-login
export async function teacherLogin(
  email: string,
  password: string
): Promise<{ token: string; teacher: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/auth/teacher-login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Teacher login failed');
  }
  return data;
}

// Get teacher profile - GET /api/teachers/teacher-id/:teacherId
export async function getTeacherProfile(
  teacherId: string,
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/teachers/teacher-id/${encodeURIComponent(teacherId)}`, {
    headers: getHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to fetch teacher profile');
  }
  return (data.teacher ?? data) as Record<string, unknown>;
}

// Update teacher profile - PUT /api/teachers/:id (needs MongoDB _id)
export async function updateTeacherProfile({
  teacherId,
  token,
  updates,
}: {
  teacherId: string;
  token: string;
  updates: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  // First get the teacher to get the MongoDB _id
  const profile = await getTeacherProfile(teacherId, token);
  const mongoId = String(profile._id ?? profile.id ?? '');
  
  if (!mongoId) {
    throw new Error('Teacher ID not found');
  }

  const res = await fetch(`${API_BASE}/teachers/${mongoId}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to update teacher profile');
  }
  return (data.teacher ?? data) as Record<string, unknown>;
}

// Change teacher password - PUT /api/teachers/:id/change-password (needs MongoDB _id)
export async function changeTeacherPassword({
  teacherId,
  token,
  currentPassword,
  newPassword,
}: {
  teacherId: string;
  token: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  // First get the teacher to get the MongoDB _id
  const profile = await getTeacherProfile(teacherId, token);
  const mongoId = String(profile._id ?? profile.id ?? '');
  
  if (!mongoId) {
    throw new Error('Teacher ID not found');
  }

  const res = await fetch(`${API_BASE}/teachers/${mongoId}/change-password`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to change password');
  }
}

// Get attendance records - GET /api/history
export interface AttendanceRecordsParams {
  token: string;
  gradeLevel?: string;
  section?: string;
  subject?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceRecordsResponse {
  records: Record<string, unknown>[];
  pagination: Record<string, unknown>;
}

export async function getAttendanceRecords({
  token,
  gradeLevel,
  section,
  subject,
  status,
  page = 1,
  limit = 50,
}: AttendanceRecordsParams): Promise<AttendanceRecordsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (gradeLevel) params.set('gradeLevel', gradeLevel);
  if (section) params.set('section', section);
  if (subject) params.set('subject', subject);
  if (status) params.set('status', status);

  const res = await fetch(`${API_BASE}/history?${params}`, {
    headers: getHeaders(token),
  });
  const data = await res.json();
  if (res.status === 401) {
    throw new Error('Unauthorized - Invalid or expired token');
  }
  if (!res.ok) {
    return { records: [], pagination: {} };
  }
  return {
    records: (data.records ?? []) as Record<string, unknown>[],
    pagination: (data.pagination ?? {}) as Record<string, unknown>,
  };
}

// Get attendance stats - GET /api/history/stats
export interface AttendanceStatsParams {
  token: string;
  gradeLevel?: string;
  section?: string;
  startDate?: string;
  endDate?: string;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  cutting: number;
  total: number;
}

export async function getAttendanceStats({
  token,
  gradeLevel,
  section,
  startDate,
  endDate,
}: AttendanceStatsParams): Promise<AttendanceStats> {
  const params = new URLSearchParams();
  if (gradeLevel) params.set('gradeLevel', gradeLevel);
  if (section) params.set('section', section);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const qs = params.toString();
  const url = qs ? `${API_BASE}/history/stats?${qs}` : `${API_BASE}/history/stats`;
  const res = await fetch(url, {
    headers: getHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) {
    return { present: 0, absent: 0, late: 0, cutting: 0, total: 0 };
  }
  const stats = data.stats ?? data;
  return {
    present: Number(stats.present ?? 0),
    absent: Number(stats.absent ?? 0),
    late: Number(stats.late ?? 0),
    cutting: Number(stats.cutting ?? 0),
    total: Number(stats.total ?? 0),
  };
}

// Update attendance record - PATCH /api/history/:recordId
export async function updateAttendanceRecord({
  recordId,
  status,
  token,
  notes,
  reason,
}: {
  recordId: string;
  status: string;
  token: string;
  notes?: string;
  reason?: string;
}): Promise<Record<string, unknown>> {
  const body: Record<string, string> = { status };
  if (notes) body.notes = notes;
  if (reason) body.reason = reason;

  const res = await fetch(`${API_BASE}/history/${recordId}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to update attendance');
  }
  return (data.record ?? data) as Record<string, unknown>;
}

// Get teacher schedule - GET /api/schedules
export interface TeacherScheduleParams {
  token: string;
  teacherId?: string;
  teacherName?: string;
  day?: string;
}

export async function getTeacherSchedule({
  token,
  teacherId,
  teacherName,
  day,
}: TeacherScheduleParams): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams();
  if (teacherId) params.set('teacherId', teacherId);
  if (teacherName) params.set('teacher', teacherName);
  if (day) params.set('day', day);

  const qs = params.toString();
  const url = qs ? `${API_BASE}/schedules?${qs}` : `${API_BASE}/schedules`;

  const res = await fetch(url, {
    headers: getHeaders(token),
  });
  const data = await res.json();
  if (res.status === 401) {
    throw new Error('Unauthorized - Invalid or expired token');
  }
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to fetch schedule');
  }
  const schedules = data.schedules ?? data;
  return Array.isArray(schedules) ? schedules : [schedules];
}

// Get class students - GET /api/students/teacher/schedule
export interface ClassStudentsParams {
  gradeLevel: string;
  section: string;
  teacherName: string;
  token: string;
  subject?: string;
  shift?: string;
}

export async function getClassStudents({
  gradeLevel,
  section,
  teacherName,
  token,
  subject,
  shift,
}: ClassStudentsParams): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    gradeLevel,
    section,
    teacherName,
  });
  if (subject) params.set('subject', subject);
  if (shift) params.set('shift', shift);

  const res = await fetch(`${API_BASE}/students/teacher/schedule?${params}`, {
    headers: getHeaders(token),
  });
  const data = await res.json();
  if (res.status === 400) return [];
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to fetch students');
  }
  const list = Array.isArray(data) ? data : [data];
  return list as Record<string, unknown>[];
}

// Get schedule attendance records - GET /api/schedules/:scheduleId/attendance
export async function getScheduleAttendanceRecords({
  token,
  scheduleId,
  date,
}: {
  token: string;
  scheduleId: string;
  date: string;
}): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({ scheduleId, date });
  const res = await fetch(
    `${API_BASE}/schedules/${scheduleId}/attendance?${params}`,
    { headers: getHeaders(token) }
  );
  const data = await res.json();
  if (res.status === 404) return [];
  if (!res.ok) {
    return [];
  }
  const records = data.records ?? data.attendance ?? data;
  return Array.isArray(records) ? records : [records];
}

// Update student attendance - PATCH /api/schedules/:scheduleId/student-attendance
export async function updateStudentAttendance({
  token,
  studentId,
  scheduleId,
  status,
  subject,
  gradeLevel,
  section,
}: {
  token: string;
  studentId: string;
  scheduleId: string;
  status: string;
  subject?: string;
  gradeLevel?: string;
  section?: string;
}): Promise<Record<string, unknown>> {
  const body: Record<string, string> = {
    studentId,
    scheduleId,
    status,
    timestamp: new Date().toISOString(),
  };
  if (subject) body.subject = subject;
  if (gradeLevel) body.gradeLevel = gradeLevel;
  if (section) body.section = section;

  const res = await fetch(
    `${API_BASE}/schedules/${scheduleId}/student-attendance`,
    {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data.error as string) ?? 'Failed to update attendance status'
    );
  }
  return (data.result ?? data) as Record<string, unknown>;
}

// Get student attendance history - GET /api/history/student/:studentId
export async function getStudentHistory({
  token,
  studentId,
  startDate,
  endDate,
  limit = 100,
}: {
  token: string;
  studentId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<{
  student: Record<string, unknown>;
  records: Record<string, unknown>[];
  stats?: Record<string, unknown>;
}> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const url = qs
    ? `${API_BASE}/history/student/${encodeURIComponent(studentId)}?${qs}`
    : `${API_BASE}/history/student/${encodeURIComponent(studentId)}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  const data = await res.json();
  if (res.status === 404) {
    throw new Error('Student not found');
  }
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Failed to load student history');
  }
  return {
    student: (data.student ?? {}) as Record<string, unknown>,
    records: Array.isArray(data.records) ? data.records : [],
    stats: data.stats as Record<string, unknown> | undefined,
  };
}
