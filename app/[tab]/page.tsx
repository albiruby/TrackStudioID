/**
 * ============================================================================
 * TRACK.STUDIO SYSTEM RULES & INTEGRITY LAWS:
 * NO AI, NO FAKE DATA, REAL DATA ONLY.
 * ============================================================================
 */

import React from 'react';
import TrackStudioShell from '../../components/track-studio-shell';
import { AppShell } from '../../components/layout/AppShell';

interface PageProps {
  params: Promise<{ tab: string }>;
}

// Pre-define allowed sports science segments ahead of time for Next.js compile-time static pre-rendering (Zero overhead)
export async function generateStaticParams() {
  const allowedTabs = [
    'dashboard', 'activities', 'training', 'workout-library', 'compare-lab',
    'form-lab', 'course-records', 'best-efforts', 'gear-lab', 'trail-lab',
    'prediction', 'vdot-calculator', 'hr-calculator', 'wellness', 'hrv-lab',
    'morning-check', 'sleep', 'overtraining-guard', 'injury-radar', 'reports',
    'route-art', 'athlete-profile', 'how-to-use', 'settings', 'data-health'
  ];
  return allowedTabs.map((tab) => ({
    tab,
  }));
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const tab = resolvedParams.tab;
  const activeTab = (tab === 'dashboard' || tab === 'activities' || tab === 'wellness') ? tab : 'dashboard';

  return (
    <AppShell>
      <TrackStudioShell activeTab={activeTab} />
    </AppShell>
  );
}
