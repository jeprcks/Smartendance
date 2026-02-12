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

  useEffect(() => {
    setMounted(true);
    const data = getTeacherData();
    if (!data.token) {
      router.push('/login');
      return;
    }
    setTeacherName(data.teacherName ?? '');
    setTeacherId(data.teacherId ?? '');
    setTeacherEmail(data.teacherEmail ?? '');
  }, [router]);

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
        onClose={() => setSidebarOpen(false)}
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
