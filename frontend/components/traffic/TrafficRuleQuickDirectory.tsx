'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  FileCheck,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import trafficRuleApi from '@/services/trafficRuleApi';
import { TrafficRule } from '@/types';

// Fallback verified Motor Vehicles Act rules for instantaneous client rendering
const DEFAULT_RULES: Partial<TrafficRule>[] = [
  {
    _id: 'rule-speed-01',
    ruleCode: 'MVA-112',
    title: 'Speed Limits Compliance',
    description: 'City Roads: 50 km/h | School/Hospital Zones: 25 km/h | Expressways: 100 km/h. Exceeding speed limit attracts penalty fine.',
    fineAmount: 2000,
    category: 'SPEED',
    state: 'Bihar'
  },
  {
    _id: 'rule-helmet-01',
    ruleCode: 'MVA-129',
    title: 'Mandatory ISI Helmet for Two-Wheelers',
    description: 'Rider and pillion must wear ISI-certified protective headgear with chin strap securely fastened at all times.',
    fineAmount: 1000,
    category: 'HELMET',
    state: 'Bihar'
  },
  {
    _id: 'rule-seatbelt-01',
    ruleCode: 'MVA-194B',
    title: 'Mandatory Seat Belt Rule',
    description: 'Driver and all front/rear occupants must wear functional seat belts while the vehicle is in motion on public roads.',
    fineAmount: 1000,
    category: 'HELMET',
    state: 'Bihar'
  },
  {
    _id: 'rule-license-01',
    ruleCode: 'MVA-181',
    title: 'Valid Driving Licence & Documents',
    description: 'Driving without a valid Driving Licence, Registration Certificate (RC), or Pollution Under Control (PUC) certificate.',
    fineAmount: 5000,
    category: 'DOCUMENT',
    state: 'Bihar'
  },
  {
    _id: 'rule-drunk-01',
    ruleCode: 'MVA-185',
    title: 'Drunk Driving & Intoxication Prohibited',
    description: 'Driving under the influence of alcohol (>30mg/100ml) or narcotics. Strict penalty and vehicle impoundment.',
    fineAmount: 10000,
    category: 'SIGNAL',
    state: 'Bihar'
  }
];

export const TrafficRuleQuickDirectory: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('Bihar');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [rules, setRules] = useState<Partial<TrafficRule>[]>(DEFAULT_RULES);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRules = async () => {
      try {
        setIsLoading(true);
        const res = await trafficRuleApi.getRulesByState(selectedState, {
          category: activeCategory !== 'ALL' ? activeCategory : undefined,
          limit: 6
        });

        if (isMounted && res && res.data && res.data.length > 0) {
          setRules(res.data);
        } else if (isMounted) {
          // Filter default rules by active category
          const filtered = activeCategory === 'ALL'
            ? DEFAULT_RULES
            : DEFAULT_RULES.filter((r) => r.category === activeCategory);
          setRules(filtered);
        }
      } catch (err) {
        if (isMounted) {
          const filtered = activeCategory === 'ALL'
            ? DEFAULT_RULES
            : DEFAULT_RULES.filter((r) => r.category === activeCategory);
          setRules(filtered);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRules();

    return () => {
      isMounted = false;
    };
  }, [selectedState, activeCategory]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 font-sans h-full">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-outfit uppercase tracking-tight">
                TRAFFIC RULE DIRECTORY
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Motor Vehicles Act & State Regulations
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>MVA 2019</span>
          </span>
        </div>

        {/* State Selector & Category Tabs */}
        <div className="flex flex-col gap-2 pt-1 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 shrink-0">Jurisdiction:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="Bihar">State: Bihar (Patna)</option>
              <option value="Delhi">State: Delhi NCR</option>
              <option value="Maharashtra">State: Maharashtra</option>
              <option value="Karnataka">State: Karnataka</option>
              <option value="Central">Central (National)</option>
            </select>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'SPEED', label: 'Speed' },
              { id: 'HELMET', label: 'Safety' },
              { id: 'DOCUMENT', label: 'Licence' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Rules List */}
        <div className="space-y-2.5 pt-2">
          {rules.slice(0, 4).map((rule, idx) => (
            <div
              key={rule._id || idx}
              className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-200 hover:bg-white transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white border border-slate-200 text-sky-700 shadow-2xs">
                  {rule.ruleCode || 'MVA'}
                </span>
                <span className="text-[10px] font-mono font-black text-rose-600">
                  {rule.fineAmount ? `₹${rule.fineAmount.toLocaleString()} Fine` : 'Penalty as per MVA'}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors font-outfit line-clamp-1">
                {rule.title}
              </h4>

              <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* View All Traffic Rules Footer Button */}
      <div className="pt-3 border-t border-slate-100">
        <Link
          href="/traffic-rules"
          className="w-full py-2.5 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-extrabold text-xs flex items-center justify-between transition-all group shadow-2xs font-mono"
        >
          <span>View All Traffic Rules</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default TrafficRuleQuickDirectory;
