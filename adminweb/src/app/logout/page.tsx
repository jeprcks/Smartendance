'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { removeToken } from '../utils/auth';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Use our auth utility to properly clear tokens
    removeToken();

    // Clear any additional storage if needed
    localStorage.clear();
    
    // Clear session storage as well
    sessionStorage.clear();

    // Redirect to login page with replace to prevent back navigation
    router.replace('/login');
  }, [router]);

  // Show a loading state while logging out
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Logging out...</h1>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}