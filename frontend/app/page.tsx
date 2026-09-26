'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Eye,
  BookOpen,
  Navigation as NavIcon,
  AlertTriangle,
  PhoneCall,
  ArrowRight,
  Shield,
  Activity,
  Cpu,
  Car
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-12 animate-fade-in pb-16 font-sans">
      {/* Hero Section */}
      <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-mono text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>SAFEWAY.AI PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-outfit leading-tight">
            Intelligent Road Safety & Driver Assistance Platform
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Real-time computer vision, driver fatigue monitoring, Motor Vehicles Act rules directory, geospatial hazard mapping, and V2V emergency mesh.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 font-mono">
            <Link
              href="/dashboard"
              className="px-6 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all hover:scale-105"
            >
              <span>LAUNCH OPERATIONS DASHBOARD</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/drowsiness"
              className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>DRIVER MONITOR</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Primary Feature Showcase Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit">
              Platform Safety Modules
            </h2>
            <p className="text-xs text-slate-500">
              Select a module below to launch live perception or management tools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Operations Dashboard Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-bold">
                <Car className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Operations Dashboard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Central HMI telemetry cockpit featuring 3D vehicle canvas, speed advisories, camera feed, and V2V mesh.
              </p>
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Drowsiness Monitor Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Drowsiness Monitor</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Computer vision landmark tracking computing Eye Aspect Ratio (EAR) and eye closure alerts.
              </p>
            </div>
            <Link href="/drowsiness" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <span>Launch Monitor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Traffic Rules Directory Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Traffic Rules Directory</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Government-verified Motor Vehicles Act rules, state-wise penalty fines, and speed guidelines.
              </p>
            </div>
            <Link href="/traffic-rules" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Explore Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Smart Navigation Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <NavIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Smart Navigation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                3D route guidance overlaid with real-time hazard markers and dynamic speed limit advisories.
              </p>
            </div>
            <Link href="/navigation" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <span>Start Navigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Road Hazards Map Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Road Hazards Map</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Crowdsourced hazard reporting network mapping potholes, accidents, and low visibility zones.
              </p>
            </div>
            <Link href="/hazards" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              <span>View Hazard Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Emergency SOS Card */}
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-rose-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Emergency SOS</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated crash impact detection dispatching live GPS coordinates to contacts & emergency services.
              </p>
            </div>
            <Link href="/emergency" className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
              <span>Configure SOS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
