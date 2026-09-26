'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Activity, AlertOctagon, Car, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [aiServiceStatus, setAiServiceStatus] = useState<'online' | 'offline'>('offline');
  const [aiReason, setAiReason] = useState<string | null>(null);

  const checkHealth = async () => {
    try {
      setBackendStatus('checking');
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiHost}/health`);

      if (res.ok) {
        const data = await res.json();
        setBackendStatus('connected');
        const isOnline = data.aiService === 'online';
        setAiServiceStatus(isOnline ? 'online' : 'offline');
        setAiReason(data.aiServiceReason || (isOnline ? 'Service Connected' : 'Python AI service unreachable'));
      } else {
        setBackendStatus('offline');
        setAiServiceStatus('offline');
        setAiReason(`Node Backend returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      setBackendStatus('offline');
      setAiServiceStatus('offline');
      setAiReason('Node Express Backend unreachable on localhost:5000');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const healthTooltip = `Backend: ${backendStatus.toUpperCase()} | AI Service: ${aiServiceStatus.toUpperCase()}${aiReason ? ` (${aiReason})` : ''}`;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand Logo Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 tracking-tight font-outfit">
                SafeWay<span className="text-sky-600 font-black">.AI</span>
              </span>
              <span className="hidden sm:block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Intelligent Road Safety Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Dual API & AI Health Status Badge */}
          <button
            onClick={checkHealth}
            title={healthTooltip}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-mono font-medium hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            {backendStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold">Backend: CONNECTED</span>
                <span className="text-slate-300">|</span>
                <span className={aiServiceStatus === 'online' ? 'text-sky-700 font-bold' : 'text-amber-700 font-bold'}>
                  AI: {aiServiceStatus.toUpperCase()}
                </span>
              </>
            ) : backendStatus === 'offline' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-700 font-bold">Backend Disconnected</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span className="text-amber-700 font-bold">Verifying...</span>
              </>
            )}
          </button>

          {/* Driving Mode Shortcut */}
          <Link
            href="/drowsiness"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all"
          >
            <Car className="w-4 h-4 text-sky-600" />
            <span>Driver Monitor</span>
          </Link>

          {/* SOS Shortcut */}
          <Link
            href="/emergency"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:scale-105 transition-all"
          >
            <AlertOctagon className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Emergency SOS</span>
            <span className="sm:hidden">SOS</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
