'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DriverDrowsinessMetrics } from '@/hooks/useLiveTrip';

interface DrowsinessContextType {
  metrics: DriverDrowsinessMetrics;
  isMonitoringActive: boolean;
  updateMetrics: (newMetrics: Partial<DriverDrowsinessMetrics>) => void;
  setMonitoringActive: (active: boolean) => void;
}

const defaultMetrics: DriverDrowsinessMetrics = {
  faceDetected: false,
  eyesDetected: false,
  leftEAR: null,
  rightEAR: null,
  ear: null,
  eyeState: 'UNKNOWN',
  eyeClosureDurationMs: 0,
  drowsinessScore: 0,
  riskLevel: 'LOW',
  alert: false,
  alertState: 'ATTENTIVE',
  timestamp: new Date().toISOString()
};

const DrowsinessContext = createContext<DrowsinessContextType>({
  metrics: defaultMetrics,
  isMonitoringActive: false,
  updateMetrics: () => {},
  setMonitoringActive: () => {}
});

export const DrowsinessProvider = ({ children }: { children: ReactNode }) => {
  const [metrics, setMetrics] = useState<DriverDrowsinessMetrics>(defaultMetrics);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);

  const updateMetrics = useCallback((newMetrics: Partial<DriverDrowsinessMetrics>) => {
    setMetrics((prev) => ({
      ...prev,
      ...newMetrics,
      timestamp: newMetrics.timestamp || new Date().toISOString()
    }));
  }, []);

  const setMonitoringActive = useCallback((active: boolean) => {
    setIsMonitoringActive(active);
  }, []);

  return (
    <DrowsinessContext.Provider
      value={{
        metrics,
        isMonitoringActive,
        updateMetrics,
        setMonitoringActive
      }}
    >
      {children}
    </DrowsinessContext.Provider>
  );
};

export const useDrowsinessContext = () => useContext(DrowsinessContext);
