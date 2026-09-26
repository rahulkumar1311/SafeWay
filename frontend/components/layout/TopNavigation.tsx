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
  Settings as SettingsIcon,
  Home
} from 'lucide-react';

export const navItems = [
  { path: '/', label: 'Landing Page', icon: Home },
  { path: '/dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
  { path: '/drowsiness', label: 'Drowsiness Monitor', icon: Eye, badge: 'AI' },
  { path: '/traffic-rules', label: 'Traffic Rules Directory', icon: BookOpen, badge: 'MVA' },
  { path: '/road-safety', label: 'Road Safety & Alerts', icon: ShieldAlert, badge: 'AI' },
  { path: '/navigation', label: 'Smart Navigation', icon: Navigation, badge: 'Maps' },
  { path: '/hazards', label: 'Road Hazards Map', icon: AlertTriangle },
  { path: '/emergency', label: 'Emergency SOS', icon: PhoneCall, isEmergency: true },
  { path: '/settings', label: 'Platform Settings', icon: SettingsIcon }
];

export const TopNavigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-3 sm:px-6 py-2 shadow-2xs sticky top-[61px] z-30 backdrop-blur-md bg-white/95">
      <div className="max-w-[1600px] mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 group ${
                isActive
                  ? item.isEmergency
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-2xs'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-2xs ring-1 ring-sky-500/20'
                  : item.isEmergency
                  ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 border border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive
                    ? item.isEmergency
                      ? 'text-rose-600'
                      : 'text-sky-600'
                    : item.isEmergency
                    ? 'text-rose-500'
                    : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              <span>{item.label}</span>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold tracking-wider ${
                    isActive
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default TopNavigation;
