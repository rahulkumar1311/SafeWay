import React, { createContext, useContext, useState, useEffect } from 'react';
import { audioEngine } from '../services/AudioEngine';

const AppContext = createContext();

export const initialContacts = [
  { id: 1, name: 'Sarah Morgan', relation: 'Spouse', phone: '+1 (555) 234-5678', primary: true },
  { id: 2, name: 'Marcus Vance', relation: 'Fleet Supervisor', phone: '+1 (555) 987-6543', primary: false },
  { id: 3, name: 'Dr. Robert Hayes', relation: 'Personal Physician', phone: '+1 (555) 345-6789', primary: false }
];

export const initialNearbyVehicles = [
  { id: 'V-102', type: 'Sedan', distance: 42, direction: 'Behind - Lane 2', speed: 85, alerted: false, driver: 'Vehicle 102' },
  { id: 'V-409', type: 'Heavy Truck', distance: 88, direction: 'Behind - Lane 1', speed: 78, alerted: false, driver: 'Freight Trans' },
  { id: 'V-771', type: 'SUV', distance: 135, direction: 'Ahead - Lane 2', speed: 92, alerted: false, driver: 'Commuter 771' },
  { id: 'V-304', type: 'EV Coupe', distance: 180, direction: 'Left Lane', speed: 95, alerted: false, driver: 'Rider 304' }
];

export const initialDriver = {
  name: 'Alex Morgan',
  role: 'Commercial Fleet Specialist',
  license: 'DL-984210-CA',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  safetyScore: 98,
  tripsCompleted: 342,
  hoursDrivenToday: 4.5,
  fatigueBaseline: 14,
  biometricsVerified: true
};

export const AppProvider = ({ children }) => {
  // Navigation Screen State
  const [activeScreen, setActiveScreen] = useState('home'); // 'login', 'home', 'safety_dashboard', 'navigation', 'traffic_rules', 'emergency'
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [driverProfile, setDriverProfile] = useState(initialDriver);

  // Audio & Settings State
  const [isMuted, setIsMuted] = useState(false);
  const [voiceGuidance, setVoiceGuidance] = useState(true);

  // Real-time Detection Engine States
  // systemState: 'NORMAL' | 'STAGE_1_ALERT' | 'STAGE_2_DECELERATING' | 'STAGE_3_STOPPED_SOS'
  const [systemState, setSystemState] = useState('NORMAL');
  const [feedMode, setFeedMode] = useState('simulated_normal'); // 'webcam', 'simulated_normal', 'simulated_drowsy', 'simulated_unresponsive', 'simulated_night'
  
  const [earScore, setEarScore] = useState(0.36); // Eye Aspect Ratio: Normal ~0.35, Drowsy <0.22
  const [fatigueLevel, setFatigueLevel] = useState(18); // 0-100%
  const [blinkRate, setBlinkRate] = useState(16); // blinks per min
  const [yawnCount, setYawnCount] = useState(0);
  const [headTiltAngle, setHeadTiltAngle] = useState(0); // degrees
  const [vehicleSpeed, setVehicleSpeed] = useState(85); // km/h

  // Stage 1 Timer
  const [stage1Countdown, setStage1Countdown] = useState(5);
  
  // Emergency Contacts & V2V Data
  const [emergencyContacts, setEmergencyContacts] = useState(initialContacts);
  const [nearbyVehicles, setNearbyVehicles] = useState(initialNearbyVehicles);
  const [sosSent, setSosSent] = useState(false);
  const [incidentLogs, setIncidentLogs] = useState([
    { id: 'LOG-991', timestamp: '10:14 AM', type: 'Stage 1 Warning', resolution: 'Re-engaged via Double Blink', ear: 0.18 },
    { id: 'LOG-840', timestamp: 'Yesterday', type: 'Rest Stop Alert', resolution: 'Driver took 15m Coffee break', ear: 0.21 }
  ]);

  // Handle Mute Toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
  };

  // Re-engagement function when driver responds in Stage 1
  const reengageDriver = (method = 'Manual Tap') => {
    audioEngine.stopAlert();
    audioEngine.playReengageSuccess();
    if (voiceGuidance) {
      audioEngine.speak("Driver re-engaged. Returning to safe monitoring.");
    }
    setSystemState('NORMAL');
    setStage1Countdown(5);
    setEarScore(0.35);
    setFatigueLevel(prev => Math.max(15, prev - 10));
    
    // Log incident
    const newLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'Stage 1 Alert Cancelled',
      resolution: `Re-engaged via ${method}`,
      ear: parseFloat(earScore.toFixed(2))
    };
    setIncidentLogs(prev => [newLog, ...prev]);
  };

  // Trigger Stage 1 Alert
  const triggerStage1 = () => {
    if (systemState !== 'NORMAL') return;
    setSystemState('STAGE_1_ALERT');
    setStage1Countdown(5);
    audioEngine.playStage1Alert();
    if (voiceGuidance) {
      audioEngine.speak("Drowsiness detected! Please wake up and re-engage immediately.");
    }
  };

  // Stage 1 Countdown Timer Effect
  useEffect(() => {
    let timer = null;
    if (systemState === 'STAGE_1_ALERT') {
      if (stage1Countdown > 0) {
        timer = setTimeout(() => {
          setStage1Countdown(prev => prev - 1);
        }, 1000);
      } else {
        // 5 seconds expired without response -> Escalate to Stage 2
        setSystemState('STAGE_2_DECELERATING');
        audioEngine.stopAlert();
        audioEngine.playEmergencySiren();
        if (voiceGuidance) {
          audioEngine.speak("Driver unresponsive. Initiating autonomous safe pull-over and deceleration.");
        }
      }
    }
    return () => clearTimeout(timer);
  }, [systemState, stage1Countdown, voiceGuidance]);

  // Stage 2 Deceleration to Stage 3 Emergency Stop Effect
  useEffect(() => {
    let decelInterval = null;
    if (systemState === 'STAGE_2_DECELERATING') {
      decelInterval = setInterval(() => {
        setVehicleSpeed(prev => {
          if (prev <= 5) {
            clearInterval(decelInterval);
            // Transition to STAGE 3 (Stopped & SOS)
            setSystemState('STAGE_3_STOPPED_SOS');
            setSosSent(true);
            
            // Alert nearby vehicles in 200m radius
            setNearbyVehicles(vList => vList.map(v => ({ ...v, alerted: true })));

            audioEngine.stopAlert();
            if (voiceGuidance) {
              audioEngine.speak("Vehicle safely stopped. Emergency SOS and 200m V2V hazard alert broadcasted.");
            }
            return 0;
          }
          return prev - 15; // Decelerate 15 km/h per step
        });
      }, 900);
    } else if (systemState === 'NORMAL') {
      setVehicleSpeed(85);
      setSosSent(false);
      setNearbyVehicles(vList => vList.map(v => ({ ...v, alerted: false })));
    }
    return () => clearInterval(decelInterval);
  }, [systemState, voiceGuidance]);

  // Preset Mode Handler
  const changeFeedMode = (mode) => {
    setFeedMode(mode);
    if (mode === 'simulated_drowsy') {
      setEarScore(0.18);
      setFatigueLevel(78);
      setBlinkRate(6);
      triggerStage1();
    } else if (mode === 'simulated_unresponsive') {
      setEarScore(0.08);
      setFatigueLevel(95);
      setBlinkRate(2);
      triggerStage1();
    } else if (mode === 'simulated_normal') {
      setSystemState('NORMAL');
      audioEngine.stopAlert();
      setEarScore(0.36);
      setFatigueLevel(18);
      setBlinkRate(16);
      setVehicleSpeed(85);
    }
  };

  // Reset entire system to fresh monitoring
  const resetSystem = () => {
    audioEngine.stopAlert();
    setSystemState('NORMAL');
    setFeedMode('simulated_normal');
    setEarScore(0.36);
    setFatigueLevel(18);
    setVehicleSpeed(85);
    setStage1Countdown(5);
    setSosSent(false);
    setNearbyVehicles(vList => vList.map(v => ({ ...v, alerted: false })));
  };

  return (
    <AppContext.Provider value={{
      activeScreen, setActiveScreen,
      isLoggedIn, setIsLoggedIn,
      driverProfile, setDriverProfile,
      isMuted, toggleMute,
      voiceGuidance, setVoiceGuidance,
      systemState, setSystemState,
      feedMode, changeFeedMode,
      earScore, setEarScore,
      fatigueLevel, setFatigueLevel,
      blinkRate, setBlinkRate,
      yawnCount, setYawnCount,
      headTiltAngle, setHeadTiltAngle,
      vehicleSpeed, setVehicleSpeed,
      stage1Countdown,
      reengageDriver,
      triggerStage1,
      emergencyContacts, setEmergencyContacts,
      nearbyVehicles, setNearbyVehicles,
      sosSent, setSosSent,
      incidentLogs, setIncidentLogs,
      resetSystem
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
