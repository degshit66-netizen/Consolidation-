/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings as SettingsIcon, Globe, CreditCard, Shield, Database } from 'lucide-react';
import { useConsolidation } from '../context/ConsolidationContext';

export default function SettingsView() {
  const { settings, updateSettings } = useConsolidation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Configuration</h1>
        <p className="text-slate-400 text-sm mt-1">Global engine parameters and accounting standards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f1218] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <Globe className="text-blue-500" size={20} />
            <h3 className="font-bold text-white uppercase tracking-widest text-xs">Regional & Currency</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Presentation Currency</label>
              <select 
                value={settings.baseCurrency}
                onChange={e => updateSettings({ ...settings, baseCurrency: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
              >
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Reporting Period</label>
              <input 
                type="text" 
                value={settings.reportingPeriod}
                onChange={e => updateSettings({ ...settings, reportingPeriod: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#0f1218] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <Shield className="text-emerald-500" size={20} />
            <h3 className="font-bold text-white uppercase tracking-widest text-xs">Security & Access (RBAC)</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors group">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Controller Access</span>
                <span className="text-[10px] text-slate-500">Full engine authorization</span>
              </div>
              <div className="w-10 h-5 bg-blue-600 rounded-full relative transition-all group-active:scale-95">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors group">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Auditor Mode</span>
                <span className="text-[10px] text-slate-500">Read-only IFRS verification</span>
              </div>
              <div className="w-10 h-5 bg-slate-700 rounded-full relative transition-all group-active:scale-95">
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1218] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <Database className="text-purple-500" size={20} />
            <h3 className="font-bold text-white uppercase tracking-widest text-xs">Data Standards</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              IFRS 10: Consolidated Financial Statements
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              IAS 21: The Effects of Changes in Foreign Exchange Rates
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              CPA Canada Handbook - Part I
            </div>
            
            <div className="pt-4 border-t border-slate-800">
              <button 
                onClick={() => {
                  if (window.confirm('WARNING: This will permanently delete all entities, trial balances, and logs. This action cannot be undone. Continue?')) {
                    indexedDB.deleteDatabase('storagedb');
                    window.location.reload();
                  }
                }}
                className="w-full px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              >
                Factory Reset Engine
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
