'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { athleteProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!athleteProfile && pathname !== '/login') {
      router.push('/login');
    } else if (athleteProfile && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [athleteProfile, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs tracking-wider uppercase">ACCESSING ATHLETE VAULT...</span>
      </div>
    );
  }

  // Prevent flash of protected page content
  if (!athleteProfile && pathname !== '/login') {
    return null;
  }
  if (athleteProfile && pathname === '/login') {
    return null;
  }

  return <>{children}</>;
}
