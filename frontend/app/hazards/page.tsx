'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, RefreshCw, Radio } from 'lucide-react';
import hazardApi from '@/services/hazardApi';
import { RoadHazard, HazardType } from '@/types';
import JioMapContainer from '@/components/navigation/JioMapContainer';

export default function HazardsPage() {
  const [hazards, setHazards] = useState<RoadHazard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [newType, setNewType] = useState<string>('pothole');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchHazards = async () => {
    try {
      setIsLoading(true);
      const res = await hazardApi.getNearbyHazards(25.5941, 85.1376, 15);
      if (res && res.data) {
        setHazards(res.data);
      }
    } catch (err) {
      console.warn('Fetch hazards error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHazards();
  }, []);

  const handleCreateHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription) return;
    try {
      setIsSubmitting(true);
      await hazardApi.reportHazard({
        type: newType as HazardType,
        description: newDescription,
        latitude: 25.5941,
        longitude: 85.1376,
        severity: 'medium'
      });
      setNewDescription('');
      fetchHazards();
    } catch (err) {
      console.error('Report hazard error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Community Crowdsourced Safety Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            Geospatial Road Hazards & Obstruction Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time hazard mapping & V2V mesh alert broadcasts for potholes, accidents, and road obstacles.
          </p>
        </div>

        <button
          onClick={fetchHazards}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-slate-300 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Map</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Column (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 font-mono">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              <span>GEOSPATIAL HAZARD OVERLAY</span>
            </div>
            <span className="text-slate-500 font-bold">HAZARDS: {hazards.length}</span>
          </div>

          <JioMapContainer
            userLocation={{ latitude: 25.5941, longitude: 85.1376, address: 'Patna' }}
            hazards={hazards}
          />
        </div>

        {/* Report Hazard Column (1/3) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-outfit uppercase tracking-wider">
              <Plus className="w-4 h-4 text-sky-600" />
              <span>Report Road Hazard</span>
            </h3>

            <form onSubmit={handleCreateHazard} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">HAZARD TYPE</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:bg-white focus:border-sky-500"
                >
                  <option value="pothole">Pothole / Broken Road</option>
                  <option value="accident">Accident Zone</option>
                  <option value="waterlogging">Flooding / Waterlogging</option>
                  <option value="construction">Road Work / Barricade</option>
                  <option value="fog">Dense Fog / Low Visibility</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">DESCRIPTION</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe location details or severity..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newDescription}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                <span>BROADCAST HAZARD TO V2V</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
