import React from 'react';
import { REQUIREMENTS } from '../../lib/data/requirements';
import { EmptyState } from './EmptyState';
import { RefreshCw } from 'lucide-react';

interface SyncRequiredStateProps {
  requirementId: keyof typeof REQUIREMENTS;
  customDescription?: string;
  onAction?: () => void;
}

export function SyncRequiredState({ requirementId, customDescription, onAction }: SyncRequiredStateProps) {
  const req = REQUIREMENTS[requirementId];
  if (!req) return null;

  return (
    <EmptyState
      title={req.title}
      description={customDescription || req.explanation}
      actionLabel={req.actionLabel}
      targetRoute={req.targetRoute}
      onAction={onAction}
      icon={<RefreshCw className="w-6 h-6 text-blue-400" />}
    />
  );
}
