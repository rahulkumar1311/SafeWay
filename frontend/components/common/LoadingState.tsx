import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data from SafeWay AI backend...'
}) => {
  return (
    <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200 shadow-sm">
      <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
      <p className="text-xs text-slate-600 font-medium">{message}</p>
    </div>
  );
};

export default LoadingState;
