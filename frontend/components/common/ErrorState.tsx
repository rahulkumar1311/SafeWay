import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Backend Service Unavailable',
  message,
  onRetry
}) => {
  return (
    <div className="bg-white rounded-2xl p-8 text-center space-y-4 border border-rose-200 shadow-sm">
      <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs text-slate-800 font-bold transition-all flex items-center gap-2 mx-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
