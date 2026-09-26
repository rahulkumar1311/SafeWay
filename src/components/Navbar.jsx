import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Eye, 
  ShieldAlert, 
  Home, 
  MapPin, 
  BookOpen, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  LogOut, 
  Radio,
  UserCheck
} from 'lucide-react';

export const Navbar = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    isMuted, 
    toggleMute, 
    systemState, 
    driverProfile, 
    setIsLoggedIn,
    sosSent
  } = useApp();

  const getSystemStatusBadge = () => {
    switch (systemState) {
      case 'STAGE_1_ALERT':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>STAGE 1: DROWSINESS ALERT</span>
          </div>
        );
      case 'STAGE_2_DECELERATING':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-xs font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>STAGE 2: DECELERATING VEHICLE</span>
          </div>
        );
      case 'STAGE_3_STOPPED_SOS':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/40 border border-red-400 text-red-100 text-xs font-extrabold animate-pulse">
            <Radio className="w-4 h-4 text-red-300" />
            <span>STAGE 3: STOPPED & SOS ACTIVE</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>SYSTEM ARMED</span>
          </div>
        );
    }
  };

  const navItems = [
    { id: 'home', label: 'Home Dashboard', icon: Home },
    { id: 'safety_dashboard', label: 'AI Safety View', icon: Eye, badge: systemState !== 'NORMAL' },
    { id: 'navigation', label: 'Navigation Map', icon: MapPin },
    { id: 'traffic_rules', label: 'Traffic Rules', icon: BookOpen },
    { id: 'emergency', label: 'Emergency SOS', icon: AlertTriangle, danger: sosSent }
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-slate-950/90 border-b border-slate-800/80 px-6 lg:px-12 py-4 mb-4 transition-all">
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-6">
        
        {/* Brand Logo - Spacious & Large */}
        <div 
          onClick={() => setActiveScreen('home')}
          className="flex items-center gap-4 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <Eye className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse border-2 border-slate-950"></div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
                DRIVE SAFE
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold">
                AI COCKPIT
              </span>
            </div>
            {/* Note: Removed "ai driver safety system active text" per user instructions */}
          </div>
        </div>

        {/* Center Navigation Links - Larger Spacing */}
        <nav className="hidden md:flex items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800/90">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                    : item.danger
                    ? 'text-red-400 hover:bg-red-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                )}
                {item.danger && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons & Driver Status */}
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className="hidden lg:block">
            {getSystemStatusBadge()}
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-2xl border transition-all ${
              isMuted 
                ? 'bg-slate-800 text-slate-400 border-slate-700' 
                : 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 hover:bg-cyan-900/40'
            }`}
            title={isMuted ? "Unmute Audio Alerts" : "Mute Audio Alerts"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Driver Avatar */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <img 
              src={driverProfile.avatar} 
              alt={driverProfile.name}
              className="w-10 h-10 rounded-full border-2 border-cyan-500/50 object-cover shadow-md"
            />
            <div className="hidden xl:block text-left">
              <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <span>{driverProfile.name}</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xs text-slate-400 font-mono">Score: {driverProfile.safetyScore}/100</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setActiveScreen('login');
            }}
            className="p-2.5 rounded-2xl bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 transition-colors"
            title="Switch Driver / Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Mobile Navigation Tabs */}
      <div className="flex md:hidden items-center justify-around mt-4 pt-3 border-t border-slate-800/80">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
