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
  Home,
  X,
  Cpu,
  Server
} from 'lucide-react';

const navItems = [
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-65px)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 overflow-y-auto">
          {/* Mobile Drawer Close Header */}
          <div className="flex items-center justify-between lg:hidden mb-4 pb-3 border-b border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Navigation Menu</span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-3 font-mono">
            SafeWay AI Navigation
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all group ${
                    isActive
                      ? item.isEmergency
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-2xs'
                        : 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? (item.isEmergency ? 'text-rose-600' : 'text-sky-600') : 'text-slate-400 group-hover:text-slate-700'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold tracking-wider rounded-md ${
                      isActive ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Topology Footprint */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="glass-card rounded-xl p-3.5 text-xs space-y-2 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>System Topology</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Server className="w-3 h-3 text-sky-600" /> Node Express
                </span>
                <span className="text-emerald-600 font-bold">:5000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Cpu className="w-3 h-3 text-teal-600" /> Python FastAPI
                </span>
                <span className="text-emerald-600 font-bold">:8000</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
