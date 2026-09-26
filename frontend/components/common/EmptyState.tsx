import React from 'react';
import { Info } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  message
}) => {
  return (
    <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200 shadow-sm">
      <Info className="w-8 h-8 text-slate-400 mx-auto" />
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">{message}</p>
    </div>
  );
};

export default EmptyState;
