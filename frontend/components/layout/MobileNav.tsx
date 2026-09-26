'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Eye,
  BookOpen,
  Navigation,
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  Home
} from 'lucide-react';

const mobileItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Console', icon: LayoutDashboard },
  { path: '/drowsiness', label: 'Monitor', icon: Eye },
  { path: '/traffic-rules', label: 'Rules', icon: BookOpen },
  { path: '/road-safety', label: 'Safety', icon: ShieldAlert },
  { path: '/navigation', label: 'Route', icon: Navigation },
  { path: '/hazards', label: 'Hazards', icon: AlertTriangle },
  { path: '/emergency', label: 'SOS', icon: PhoneCall, isEmergency: true }
];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 border-t border-slate-200 px-2 py-2 backdrop-blur-xl shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                item.isEmergency
                  ? 'text-rose-700 bg-rose-50 border border-rose-200 font-bold scale-105'
                  : isActive
                  ? 'text-sky-700 bg-sky-50 font-bold border border-sky-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
