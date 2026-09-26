import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  AlertTriangle, 
  Phone, 
  MessageSquare, 
  Building2, 
  ShieldAlert, 
  FileText, 
  Download, 
  CheckCircle2
} from 'lucide-react';

const nearbyServices = [
  { name: 'State Highway Patrol Base #4', type: 'Police', distance: '3.2 mi', status: 'ALERTED via API' },
  { name: 'St. Jude Emergency Trauma ER', type: 'Hospital', distance: '5.8 mi', status: 'Standby' }
];

export const EmergencyScreen = () => {
  const { 
    emergencyContacts, 
    sosSent, 
    setSosSent, 
    incidentLogs, 
    setSystemState 
  } = useApp();

  const [sosHolding, setSosHolding] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualSOS = () => {
    setSosHolding(true);
    setTimeout(() => {
      setSosHolding(false);
      setSosSent(true);
      setSystemState('STAGE_3_STOPPED_SOS');
      showToast("GPS Panic SOS & 200m V2V hazard alert broadcasted to dispatch!");
    }, 800);
  };

  const handleExportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["ID,Timestamp,Type,Resolution,EAR Score", ...incidentLogs.map(l => `${l.id},${l.timestamp},${l.type},${l.resolution},${l.ear}`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "DriveSafe_Incident_Logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Incident audit log exported to CSV.");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6 relative">
      
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-cyan-950 text-cyan-200 border border-cyan-500 shadow-2xl flex items-center gap-3 font-mono text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & 1-Tap SOS Button */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-red-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-red-950/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-mono font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>EMERGENCY SOS HUB</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">Instant 1-Tap Emergency Panic</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
            Broadcasts GPS coordinates to 911 dispatch, primary emergency contacts, and 200m V2V nearby traffic.
          </p>
        </div>

        <button
          onClick={handleManualSOS}
          disabled={sosHolding}
          className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full border-4 text-white font-black text-lg tracking-wider flex flex-col items-center justify-center gap-1 shadow-2xl transition-transform hover:scale-105 ${
            sosSent ? 'bg-red-600 border-red-400 shadow-[0_0_50px_#ff1744] animate-pulse' : 'bg-gradient-to-b from-red-600 to-red-900 border-red-400'
          }`}
        >
          <AlertTriangle className="w-9 h-9 animate-bounce" />
          <span className="font-mono">{sosSent ? 'ACTIVE' : sosHolding ? 'SENDING' : 'PANIC SOS'}</span>
        </button>
      </div>

      {/* Contacts & Nearby Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Emergency Contacts */}
        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-cyan-400" />
              <span>Primary Contacts</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Auto Dispatch</span>
          </div>

          <div className="space-y-2.5">
            {emergencyContacts.map(contact => (
              <div key={contact.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{contact.name} ({contact.relation})</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{contact.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => showToast(`Call sent to ${contact.name}`)} className="p-2 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button onClick={() => showToast(`GPS SMS sent to ${contact.name}`)} className="p-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Services */}
        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Nearest Police & Hospital</span>
            </h3>
            <span className="text-xs text-purple-400 font-mono">Live GPS</span>
          </div>

          <div className="space-y-2.5">
            {nearbyServices.map((service, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{service.name}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{service.type} • {service.distance}</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono font-bold">
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Incident Log Table */}
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Incident Audit Logs</span>
          </h3>
          <button onClick={handleExportLogs} className="glass-button text-xs py-2 px-4">
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            <span>EXPORT CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Event</th>
                <th className="p-3">EAR</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {incidentLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-900/60">
                  <td className="p-3 text-cyan-400 font-bold">{log.id}</td>
                  <td className="p-3 text-slate-400">{log.timestamp}</td>
                  <td className="p-3 font-bold text-white">{log.type}</td>
                  <td className="p-3 text-amber-300">{log.ear}</td>
                  <td className="p-3 text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{log.resolution}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};


