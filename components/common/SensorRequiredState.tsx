import React from 'react';
import { REQUIREMENTS } from '../../lib/data/requirements';
import { EmptyState } from './EmptyState';
import { Activity } from 'lucide-react';

interface SensorRequiredStateProps {
  requirementId: keyof typeof REQUIREMENTS;
  customDescription?: string;
}

export function SensorRequiredState({ requirementId, customDescription }: SensorRequiredStateProps) {
  const req = REQUIREMENTS[requirementId];
  if (!req) return null;

  return (
    <EmptyState
      title={req.title}
      description={customDescription || req.explanation}
      actionLabel={req.actionLabel}
      targetRoute={req.targetRoute}
      icon={<Activity className="w-6 h-6 text-emerald-400" />}
    />
  );
}
