'use client';

import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        {children}
      </div>
    </ProtectedRoute>
  );
}
