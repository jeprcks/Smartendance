'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teacherLogin } from '@/lib/api';
import { setTeacherAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);

    try {
      const res = await teacherLogin(email.trim(), password);
      const user = res.teacher as Record<string, unknown>;
      const teacherId =
        (user.teacherId ?? user._id ?? user.id ?? '') as string;
      const teacherName =
        (user.name ?? user.fullName ?? user.email ?? 'Teacher') as string;
      const teacherEmail = (user.email ?? '') as string;
      const subject = (user.subject ?? '') as string;
      const role = (user.role ?? 'Teacher') as string;
      const profilePicture = (user.profilePicture ?? user.avatar ?? user.photo ?? null) as string | null;

      if (!teacherId) {
        throw new Error('Invalid response: Teacher data not found');
      }

      setTeacherAuth({
        token: res.token,
        teacherId,
        teacherName,
        email: teacherEmail,
        subject,
        role,
        profilePicture,
      });

      router.push('/dashboard');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      if (
        msg.includes('SocketException') ||
        msg.includes('Failed host lookup') ||
        msg.includes('Connection refused') ||
        msg.includes('fetch')
      ) {
        setError(
          'Cannot connect to server. Check internet connection and try again.'
        );
      } else if (msg.includes('401') || msg.includes('Invalid') || msg.includes('Unauthorized')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: 'var(--background)' }}>
      {/* Watermark layer - same as adminweb: img for sharpness, 700px, opacity 0.12 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.12,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <img
          src="/logo/backgroundlogo.png"
          alt=""
          aria-hidden
          className="max-w-full max-h-full w-[700px] h-[700px] object-contain"
        />
      </div>
      <div className="w-full max-w-sm relative z-10">
        <div
          className="rounded-2xl p-6 border shadow-lg"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 4px 14px rgba(46, 125, 50, 0.15)',
          }}
        >
          <header
            className="text-center mb-6 rounded-t-xl -mx-6 -mt-6 px-6 pt-6 pb-5"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
              boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)',
            }}
          >
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, Teacher
            </h1>
            <p className="text-white/90 mt-1 text-sm">
              Enter your teacher credentials
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{ background: 'rgba(232, 81, 0, 0.1)', color: 'var(--error)' }}
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--foreground)' }}
              >
                Email or ID
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or ID"
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                }}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--foreground)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--primary)] pr-12"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                  }}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-75"
              style={{
                background: isLoading ? 'var(--primary-light)' : 'var(--primary)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Login as Teacher'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
