import React, { Component } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { SafetyDashboardScreen } from './components/SafetyDashboardScreen';
import { NavigationScreen } from './components/NavigationScreen';
import { TrafficRulesScreen } from './components/TrafficRulesScreen';
import { EmergencyScreen } from './components/EmergencyScreen';
import { ShieldCheck, Radio, AlertTriangle, RefreshCw } from 'lucide-react';

// Error Boundary Component to prevent any blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
          <div className="p-4 rounded-full bg-red-950/50 border border-red-500 text-red-400">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black">System Display Notice</h2>
          <p className="text-sm text-slate-400 max-w-md">
            The HUD encountered a temporary rendering state. Click below to reload the Cockpit view safely.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="glass-button glass-button-success py-2.5 px-6 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>RELOAD SAFETY COCKPIT</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainContent = () => {
  const { activeScreen, isLoggedIn } = useApp();

  if (!isLoggedIn || activeScreen === 'login') {
    return <LoginScreen />;
  }

  return (
    <main className="pb-16 animate-fade-in">
      {activeScreen === 'home' && <HomeScreen />}
      {activeScreen === 'safety_dashboard' && <SafetyDashboardScreen />}
      {activeScreen === 'navigation' && <NavigationScreen />}
      {activeScreen === 'traffic_rules' && <TrafficRulesScreen />}
      {activeScreen === 'emergency' && <EmergencyScreen />}
    </main>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
          <div>
            <Navbar />
            <MainContent />
          </div>

          {/* Global Futuristic Footer */}
          <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-4 px-6 text-center text-xs text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Drive Safe AI Driver Safety System</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" /> Computer Vision Engine
                </span>
                <span>•</span>
                <span>Real EAR Metric Active</span>
                <span>•</span>
                <span>GPS Armed</span>
              </div>
            </div>
          </footer>
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
