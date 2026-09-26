import React, { useState, useEffect } from 'react';
import { useApp, initialDriver } from '../context/AppContext';
import { 
  Eye, 
  ShieldCheck, 
  Key, 
  User, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Lock, 
  ArrowRight,
  Cpu,
  ScanLine
} from 'lucide-react';

const driversList = [
  initialDriver,
  {
    name: 'Sarah Chen',
    role: 'Express Fleet Driver',
    license: 'DL-551982-CA',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    safetyScore: 95,
    tripsCompleted: 218,
    hoursDrivenToday: 2.1,
    fatigueBaseline: 10,
    biometricsVerified: true
  },
  {
    name: 'David Miller',
    role: 'Long-Haul Transport Specialist',
    license: 'DL-882319-NV',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=250&q=80',
    safetyScore: 99,
    tripsCompleted: 580,
    hoursDrivenToday: 6.0,
    fatigueBaseline: 22,
    biometricsVerified: true
  }
];

export const LoginScreen = () => {
  const { setIsLoggedIn, setActiveScreen, setDriverProfile } = useApp();
  const [selectedDriver, setSelectedDriver] = useState(driversList[0]);
  const [pin, setPin] = useState('');
  const [authMode, setAuthMode] = useState('biometric'); // 'biometric' | 'pin'
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Biometric Scan Simulation
  const handleStartBiometricScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanSuccess(false);

    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setScanProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setScanSuccess(true);
        setTimeout(() => {
          setDriverProfile(selectedDriver);
          setIsLoggedIn(true);
          setActiveScreen('home');
        }, 800);
      }
    }, 150);
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setDriverProfile(selectedDriver);
      setIsLoggedIn(true);
      setActiveScreen('home');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Brand Vision & System Readiness */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-[0_0_20px_rgba(0,242,254,0.15)]">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wider font-mono">AI DRIVER SAFETY ECOSYSTEM</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            Drive Safe <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-blue-400">
              Autonomous Cockpit HUD
            </span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Real-time computer vision monitors driver fatigue, eye closure (EAR score), and head orientation. Features automatic 5s re-engagement alarms, controlled deceleration, GPS emergency SOS, and 200m V2V proximity alerts.
          </p>

          {/* System Hardware Diagnostics */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">AI Dashcam Lens</div>
                <div className="text-[11px] text-emerald-400 font-mono font-bold">CALIBRATED (60 FPS)</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">200m V2V Radar</div>
                <div className="text-[11px] text-cyan-400 font-mono font-bold">ONLINE & ARMED</div>
              </div>
            </div>
          </div>

          {/* Driver Selection */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Select Driver Profile</label>
            <div className="grid grid-cols-3 gap-3">
              {driversList.map(driver => {
                const isSelected = selectedDriver.name === driver.name;
                return (
                  <button
                    key={driver.name}
                    onClick={() => setSelectedDriver(driver)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col items-center sm:items-start gap-2.5 ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-950/80 to-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img 
                      src={driver.avatar} 
                      alt={driver.name} 
                      className={`w-11 h-11 rounded-full object-cover border-2 ${isSelected ? 'border-cyan-400 shadow-md shadow-cyan-400/30' : 'border-slate-700'}`}
                    />
                    <div>
                      <div className="text-xs font-extrabold text-slate-200 line-clamp-1">{driver.name}</div>
                      <div className="text-[10px] text-cyan-400 font-mono font-bold">{driver.safetyScore} Score</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Biometric / PIN Auth Box */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-7 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl border-cyan-500/30">
            
            {/* Auth Mode Tabs */}
            <div className="flex items-center justify-between mb-7 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Driver Verification</h2>
              </div>
              <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setAuthMode('biometric')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    authMode === 'biometric' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400'
                  }`}
                >
                  Face ID
                </button>
                <button
                  onClick={() => setAuthMode('pin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    authMode === 'pin' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400'
                  }`}
                >
                  PIN Code
                </button>
              </div>
            </div>

            {authMode === 'biometric' ? (
              <div className="space-y-6 text-center">
                {/* Face Scanner Frame */}
                <div className="relative w-52 h-52 mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_40px_rgba(0,242,254,0.2)]">
                  {/* Camera Live Mock Video */}
                  <img 
                    src={selectedDriver.avatar} 
                    alt="Driver Face Scan" 
                    className="w-full h-full object-cover opacity-85"
                  />

                  {/* Scanning Overlay Box */}
                  <div className="absolute inset-5 border-2 border-dashed border-cyan-400/80 rounded-2xl flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-300 absolute top-0 left-0"></div>
                    <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-300 absolute top-0 right-0"></div>
                    <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-300 absolute bottom-0 left-0"></div>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-300 absolute bottom-0 right-0"></div>
                  </div>

                  {/* Scanning Line */}
                  {isScanning && (
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#00f2fe] animate-[scanline_1.5s_infinite]"></div>
                  )}

                  {scanSuccess && (
                    <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-md flex flex-col items-center justify-center text-emerald-300">
                      <CheckCircle2 className="w-14 h-14 mb-2 animate-bounce text-emerald-400" />
                      <span className="text-base font-black tracking-wider">IDENTITY VERIFIED</span>
                      <span className="text-xs text-emerald-300 font-mono font-bold mt-0.5">100% Biometric Match</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-base font-extrabold text-white">{selectedDriver.name}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">License: {selectedDriver.license}</div>
                </div>

                {/* Scan Button or Progress */}
                {isScanning ? (
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs text-cyan-300 font-mono font-bold">
                      <span>Analyzing 68 facial anchors...</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 transition-all duration-150 shadow-[0_0_15px_#00f2fe]"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleStartBiometricScan}
                    className="w-full glass-button justify-center py-4 text-sm font-black shadow-xl shadow-cyan-500/25"
                  >
                    <Camera className="w-5 h-5 text-cyan-300" />
                    <span>AUTHENTICATE FACE ID</span>
                  </button>
                )}

              </div>
            ) : (
              /* PIN Code Input */
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div className="text-center space-y-3">
                  <p className="text-xs text-slate-400 font-mono">Enter 4-Digit Security PIN for {selectedDriver.name}</p>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-52 text-center text-4xl tracking-[0.8em] font-mono py-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-cyan-300 focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pin.length < 4}
                  className="w-full glass-button justify-center py-4 text-sm font-black disabled:opacity-50 shadow-xl shadow-cyan-500/25"
                >
                  <span>LAUNCH COCKPIT HUD</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}

            {/* Quick Guest Auto-Login */}
            <div className="mt-7 pt-5 border-t border-slate-800 text-center">
              <button
                onClick={() => {
                  setDriverProfile(selectedDriver);
                  setIsLoggedIn(true);
                  setActiveScreen('home');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-extrabold font-mono flex items-center justify-center gap-1.5 mx-auto"
              >
                <span>SKIP AUTHENTICATION & LAUNCH DEMO MODE</span> →
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

