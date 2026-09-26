'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  MapPin,
  Car,
  AlertTriangle,
  ExternalLink,
  Info,
  RefreshCw
} from 'lucide-react';
import challanApi from '@/services/challanApi';
import { ChallanInfo } from '@/types';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';

const INDIAN_STATES = [
  'Bihar',
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Uttar Pradesh',
  'Gujarat',
  'West Bengal',
  'Andhra Pradesh',
  'Assam',
  'Goa',
  'Haryana',
  'Kerala',
  'Punjab',
  'Rajasthan',
  'Telangana'
];

export default function ChallansPage() {
  const [selectedState, setSelectedState] = useState<string>('Bihar');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('');
  const [fines, setFines] = useState<ChallanInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchChallanData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const response = await challanApi.getChallanInfoByState(selectedState, {
        vehicleType: vehicleTypeFilter || undefined
      });

      if (response && response.data) {
        setFines(response.data);
      } else {
        setFines([]);
      }
    } catch (err: any) {
      console.error('Fetch challan data error:', err);
      setErrorMsg(err.message || 'Unable to retrieve state challan rates.');
      setFines([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallanData();
  }, [selectedState, vehicleTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChallanData();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>State Traffic Fines & Penalty Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
            E-Challan & Penalty Rates Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Official state transport compounding rates and statutory traffic penalty schedules.
          </p>
        </div>

        {/* State Selector */}
        <div className="flex items-center gap-2 glass-card p-2 rounded-2xl border border-slate-800 shrink-0">
          <MapPin className="w-4 h-4 text-amber-400 ml-2" />
          <span className="text-xs text-slate-400 font-semibold">State:</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vehicle Registration & Search Bar */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Car className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="Enter Vehicle Reg. Number (e.g. BR01AB1234)"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors uppercase font-mono tracking-wider"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <select
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-2xl px-4 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Vehicles</option>
              <option value="TwoWheeler">Two Wheeler</option>
              <option value="FourWheeler">Four Wheeler</option>
              <option value="Goods">Goods Carriage</option>
              <option value="Commercial">Commercial</option>
            </select>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              <Search className="w-4 h-4" />
              <span>Lookup Fines</span>
            </button>
          </div>
        </form>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Displays official statutory compounding fine schedules for <strong>{selectedState}</strong>. For live pending e-challan payment status, visit official State Parivahan portal.
          </span>
        </div>
      </div>

      {isLoading && <LoadingState message={`Loading fine schedules for ${selectedState}...`} />}

      {!isLoading && errorMsg && <ErrorState message={errorMsg} onRetry={fetchChallanData} />}

      {!isLoading && !errorMsg && fines.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Official Fine Rates for {selectedState} ({fines.length} offenses loaded)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fines.map((fine) => (
              <div
                key={fine.id}
                className="glass-card rounded-3xl p-6 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 bg-slate-900/60 shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase">
                      {fine.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{fine.vehicleType}</span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">{fine.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{fine.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Fine Amount:</span>
                    <span className="text-2xl font-extrabold text-amber-400 font-outfit">
                      ₹{fine.fineAmount?.toLocaleString('en-IN') || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>State: {selectedState}</span>
                    {fine.sourceUrl && (
                      <a
                        href={fine.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 font-sans"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
