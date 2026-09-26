'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import trafficRuleApi from '@/services/trafficRuleApi';
import { TrafficRule } from '@/types';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

export default function TrafficRulesPage() {
  const [selectedState, setSelectedState] = useState<string>('Bihar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [rules, setRules] = useState<TrafficRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchTrafficRules = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await trafficRuleApi.getRulesByState(selectedState, {
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        limit: 50
      });

      if (response && response.data) {
        setRules(response.data);
      } else {
        setRules([]);
      }
    } catch (err: any) {
      console.error('Traffic rules API error:', err);
      setErrorMessage(err.message || 'Failed to connect to Traffic Rules backend API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficRules();
  }, [selectedState, selectedCategory]);

  const filteredRules = rules.filter((rule) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rule.title.toLowerCase().includes(q) ||
      rule.description.toLowerCase().includes(q) ||
      (rule.ruleCode && rule.ruleCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Motor Vehicles Act Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            Traffic Rules & Penalties Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Government-verified traffic regulations, speed limits, fine schedules, and law references.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search rule title, penalty or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 outline-none transition-all cursor-pointer"
            >
              <option value="Bihar">State: Bihar</option>
              <option value="Delhi">State: Delhi</option>
              <option value="Maharashtra">State: Maharashtra</option>
              <option value="Karnataka">State: Karnataka</option>
              <option value="Central">Central (National Rules)</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 outline-none transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="SPEED">Speeding Rules</option>
              <option value="HELMET">Helmet & Safety</option>
              <option value="SIGNAL">Traffic Signal & Lane</option>
              <option value="DOCUMENT">License & Registration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Presentation Table / Card Grid */}
      {isLoading ? (
        <LoadingState message="Fetching official traffic rules from backend..." />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={fetchTrafficRules} />
      ) : filteredRules.length === 0 ? (
        <EmptyState title="No Traffic Rules Found" message="Try adjusting your state or search query." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <div
              key={rule._id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
                    {rule.ruleCode || 'MVA-RULE'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>VERIFIED SOURCE</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-outfit leading-snug">
                  {rule.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {rule.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">PENALTY FINE</span>
                  <span className="font-bold text-rose-700 text-sm">
                    {rule.fineAmount ? `₹${rule.fineAmount}` : 'Fine as per MVA Section'}
                  </span>
                </div>

                {rule.sourceUrl && (
                  <a
                    href={rule.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700"
                  >
                    <span>Official Gazette</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
