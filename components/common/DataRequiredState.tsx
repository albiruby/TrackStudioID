import React from 'react';
import { REQUIREMENTS } from '../../lib/data/requirements';
import { EmptyState } from './EmptyState';
import { Database } from 'lucide-react';

interface DataRequiredStateProps {
  requirementId: keyof typeof REQUIREMENTS;
  customDescription?: string;
}

export function DataRequiredState({ requirementId, customDescription }: DataRequiredStateProps) {
  const req = REQUIREMENTS[requirementId];
  if (!req) return null;

  return (
    <EmptyState
      title={req.title}
      description={customDescription || req.explanation}
      actionLabel={req.actionLabel}
      targetRoute={req.targetRoute}
      icon={<Database className="w-6 h-6 text-indigo-400" />}
    />
  );
}
