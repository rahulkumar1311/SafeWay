'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export interface CockpitRoadEvent {
  id: string;
  type: 'CROSSING' | 'SCHOOL' | 'SHARP_TURN' | 'STOP_SIGN' | 'HAZARD' | 'SPEED_ADVISORY';
  title: string;
  message: string;
  recommendedSpeedKmH?: number;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface CockpitEventHUDProps {
  currentEvent: CockpitRoadEvent | null;
  onDismiss?: () => void;
}

export const CockpitEventHUD: React.FC<CockpitEventHUDProps> = ({ currentEvent, onDismiss }) => {
  return (
    <AnimatePresence>
      {currentEvent && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="w-full mb-4"
        >
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between gap-4 font-mono ${
            currentEvent.severity === 'CRITICAL'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : currentEvent.severity === 'WARNING'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                currentEvent.severity === 'CRITICAL'
                  ? 'bg-rose-600'
                  : currentEvent.severity === 'WARNING'
                  ? 'bg-amber-600'
                  : 'bg-sky-600'
              }`}>
                {currentEvent.severity === 'CRITICAL' ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : currentEvent.severity === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase font-outfit tracking-wide">
                    {currentEvent.title}
                  </span>
                  {currentEvent.recommendedSpeedKmH && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-800">
                      ADVISORY: {currentEvent.recommendedSpeedKmH} KM/H
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-sans mt-0.5">{currentEvent.message}</p>
              </div>
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CockpitEventHUD;
