'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  // Mouse drag-to-scroll state
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability]);

  // Smooth scroll active nav item into view
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeEl = el.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      const containerLeft = el.getBoundingClientRect().left;
      const activeLeft = activeEl.getBoundingClientRect().left;
      const offset = activeLeft - containerLeft - 40;
      el.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [pathname]);

  const scrollByAmount = (amount: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Wheel event listener: converts vertical mouse wheel into horizontal scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      // If deltaY is non-zero, translate to horizontal scroll
      if (e.deltaY !== 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY * 0.85;
      }
    }
  };

  // Mouse drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-2 sm:px-4 py-1.5 shadow-2xs sticky top-[61px] z-30 backdrop-blur-md bg-white/95 select-none">
      <div className="max-w-[1600px] mx-auto relative flex items-center">
        {/* Left Scroll Arrow Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount(-220)}
            aria-label="Scroll left navigation"
            className="absolute left-0 z-20 h-8 w-8 rounded-full bg-white/95 border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Left Edge Gradient Fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}

        {/* Scrollable Nav Item Container */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-1 py-1 cursor-grab active:cursor-grabbing"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                data-active={isActive ? 'true' : 'false'}
                draggable={false}
                className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 group ${
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

        {/* Right Edge Gradient Fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}

        {/* Right Scroll Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount(220)}
            aria-label="Scroll right navigation"
            className="absolute right-0 z-20 h-8 w-8 rounded-full bg-white/95 border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  );
};

export default TopNavigation;
