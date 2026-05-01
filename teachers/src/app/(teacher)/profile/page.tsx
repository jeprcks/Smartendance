'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getTeacherData, updateTeacherDisplay } from '@/lib/auth';
import { getTeacherProfile, updateTeacherProfile } from '../../../lib/api';
import PageHeader from '@/components/PageHeader';

const MAX_AVATAR_SIZE = 256;
const AVATAR_JPEG_QUALITY = 0.85;

/** Resize image and return as JPEG data URL for profile picture */
function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > MAX_AVATAR_SIZE || height > MAX_AVATAR_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_AVATAR_SIZE) / width);
          width = MAX_AVATAR_SIZE;
        } else {
          width = Math.round((width * MAX_AVATAR_SIZE) / height);
          height = MAX_AVATAR_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

const ProfileIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CancelIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SUBJECT_OPTIONS = ['Mathematics', 'English', 'Science', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education'];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: '',
    name: '',
    email: '',
    phoneNumber: '',
    subjects: [] as string[],
    gender: '',
    password: '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherId) {
      router.push('/login');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const profileData = await getTeacherProfile(data.teacherId, token);
      setProfile(profileData);
      const subjects = Array.isArray(profileData.subjects)
        ? profileData.subjects as string[]
        : profileData.subject ? [String(profileData.subject)] : [];
      setFormData({
        teacherId: String(profileData.teacherId ?? data.teacherId ?? ''),
        name: String(profileData.name ?? data.teacherName ?? ''),
        email: String(profileData.email ?? data.teacherEmail ?? ''),
        phoneNumber: String(profileData.phoneNumber ?? ''),
        subjects,
        gender: String(profileData.gender ?? ''),
        password: String(profileData.plainPassword ?? ''),
      });
      updateTeacherDisplay({
        teacherName: String(profileData.name ?? data.teacherName ?? ''),
        teacherEmail: String(profileData.email ?? data.teacherEmail ?? ''),
        teacherSubject: subjects.length ? subjects.join(', ') : '',
        profilePicture: (profileData.profilePicture as string) ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherId) return;

    setAvatarUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const dataUrl = await imageToDataUrl(file);
      const updated = await updateTeacherProfile({
        teacherId: data.teacherId,
        token,
        updates: { profilePicture: dataUrl },
      });
      setSuccess('Profile photo updated');
      await load();
      updateTeacherDisplay({
        profilePicture: (updated?.profilePicture as string) ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update photo');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Prepare updates - exclude teacherId (read-only)
      const updates: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        subjects: formData.subjects,
        gender: formData.gender,
      };
      
      // Only include password if it's been changed (different from current plainPassword)
      const currentPassword = String(profile?.plainPassword ?? '');
      if (formData.password.trim() && formData.password !== currentPassword) {
        updates.password = formData.password;
      }

      const updated = await updateTeacherProfile({
        teacherId: data.teacherId,
        token,
        updates,
      });
      setSuccess('Profile updated successfully');
      setEditing(false);
      setShowPassword(false);
      await load();
      const updatedSubjects = Array.isArray(updated?.subjects) ? (updated.subjects as string[]).join(', ') : (updated?.subject as string) ?? '';
      updateTeacherDisplay({
        teacherName: (updated?.name as string) ?? undefined,
        teacherEmail: (updated?.email as string) ?? undefined,
        teacherSubject: updatedSubjects,
        profilePicture: (updated?.profilePicture as string) ?? undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Profile & Settings" icon={<ProfileIcon />} />

      {error && (
        <div className="p-4 rounded-xl border bg-red-50 animate-fade-in-up" style={{ borderColor: 'var(--error)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl border bg-green-50 animate-fade-in-up" style={{ borderColor: 'var(--success)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{success}</p>
        </div>
      )}

      {/* Profile avatar – editable: click to change photo */}
      <div className="flex flex-col items-center gap-3">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
          aria-label="Upload profile photo"
        />
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={avatarUploading}
          className="relative group flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold text-white shadow-lg ring-4 shrink-0 overflow-hidden transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-70 disabled:pointer-events-none"
          style={{
            background: profile?.profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
            boxShadow: '0 0 0 4px var(--border)',
          }}
          title="Change profile photo"
          aria-label="Change profile photo"
        >
          {profile?.profilePicture && typeof profile.profilePicture === 'string' ? (
            <img
              src={profile.profilePicture as string}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>
              {formData.name?.trim()
                ? formData.name
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '?'
                : '?'}
            </span>
          )}
          {avatarUploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <span
                className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"
                aria-hidden
              />
            </span>
          )}
          {!avatarUploading && (
            <span
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white text-center px-1"
              aria-hidden
            >
              Change photo
            </span>
          )}
        </button>
        <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
          Click avatar to change profile photo
        </p>
      </div>

      {/* Profile Information */}
      <div className="p-6 rounded-xl border card-theme shadow-lg dashboard-card" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>
            Profile Information
          </h2>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
              style={{ background: 'var(--secondary)', color: 'var(--primary-dark)' }}
            >
              <EditIcon />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold text-white btn-primary disabled:opacity-50"
              >
                <SaveIcon />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setShowPassword(false);
                  const subjects = Array.isArray(profile?.subjects)
                    ? (profile.subjects as string[])
                    : profile?.subject ? [String(profile.subject)] : [];
                  setFormData({
                    teacherId: String(profile?.teacherId ?? ''),
                    name: String(profile?.name ?? ''),
                    email: String(profile?.email ?? ''),
                    phoneNumber: String(profile?.phoneNumber ?? ''),
                    subjects,
                    gender: String(profile?.gender ?? ''),
                    password: String(profile?.plainPassword ?? ''),
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
                style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              >
                <CancelIcon />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Teacher ID
            </label>
            <p className="px-4 py-3 rounded-xl bg-[var(--muted)] font-medium" style={{ color: 'var(--foreground)' }}>
              {formData.teacherId || 'Not set'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>This field cannot be edited</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border input-theme"
                placeholder="Enter your full name"
              />
            ) : (
              <p className="px-4 py-3 rounded-xl bg-[var(--muted)] font-medium" style={{ color: 'var(--foreground)' }}>
                {formData.name || 'Not set'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Email
            </label>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border input-theme"
                placeholder="Enter your email"
              />
            ) : (
              <p className="px-4 py-3 rounded-xl bg-[var(--muted)] font-medium" style={{ color: 'var(--foreground)' }}>
                {formData.email || 'Not set'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Phone Number
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border input-theme"
                placeholder="Enter your phone number"
              />
            ) : (
              <p className="px-4 py-3 rounded-xl bg-[var(--muted)] font-medium" style={{ color: 'var(--foreground)' }}>
                {formData.phoneNumber || 'Not set'}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Subjects
            </label>
            {editing ? (
              <div className="flex flex-wrap gap-3">
                {SUBJECT_OPTIONS.map((sub) => (
                  <label key={sub} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.subjects.includes(sub)}
                      onChange={(e) => {
                        const newSubjects = e.target.checked
                          ? [...formData.subjects, sub]
                          : formData.subjects.filter((s) => s !== sub);
                        setFormData({ ...formData, subjects: newSubjects });
                      }}
                      className="rounded border-gray-300"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--foreground)' }}>{sub}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-[var(--muted)]">
                {formData.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'var(--primary)', color: 'white' }}
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>Not set</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Gender
            </label>
            {editing ? (
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border input-theme"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p className="px-4 py-3 rounded-xl bg-[var(--muted)] font-medium" style={{ color: 'var(--foreground)' }}>
                {formData.gender || 'Not set'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Password
            </label>
            {editing ? (
              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border input-theme"
                  placeholder="Enter new password (leave blank to keep current)"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    {showPassword ? 'Hide' : 'Show'} Password
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Leave blank to keep current password
                </p>
              </div>
            ) : (
              <div className="relative">
                <p className="px-4 py-3 rounded-xl bg-[var(--muted)] font-medium pr-20" style={{ color: 'var(--foreground)' }}>
                  {showPassword ? formData.password || 'Not set' : '••••••••'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
