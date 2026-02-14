'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTeacherData } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherProfilePicture, setTeacherProfilePicture] = useState<string | null>(null);

  const refreshTeacherDisplay = () => {
    const data = getTeacherData();
    setTeacherName(data.teacherName ?? '');
    setTeacherId(data.teacherId ?? '');
    setTeacherEmail(data.teacherEmail ?? '');
    setTeacherProfilePicture(data.profilePicture ?? null);
  };

  useEffect(() => {
    setMounted(true);
    const data = getTeacherData();
    if (!data.token) {
      router.push('/login');
      return;
    }
    refreshTeacherDisplay();
  }, [router]);

  useEffect(() => {
    const handler = () => refreshTeacherDisplay();
    window.addEventListener('teacher-profile-updated', handler);
    return () => window.removeEventListener('teacher-profile-updated', handler);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <Sidebar
        teacherName={teacherName}
        teacherId={teacherId}
        teacherEmail={teacherEmail}
        profilePicture={teacherProfilePicture}
        onClose={() => setSidebarOpen(false)}
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
