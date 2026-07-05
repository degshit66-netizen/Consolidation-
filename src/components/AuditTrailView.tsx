/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Search, Filter } from 'lucide-react';
import { useConsolidation } from '../context/ConsolidationContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AuditTrailView() {
  const { logs } = useConsolidation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">STRATIFY Audit Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">Immutable, cryptographically hashed system events for regulatory compliance.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <Lock size={16} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Tamper-Proof Ledger</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Big 4 Audit Verification Ready</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold w-48">Timestamp (UTC)</th>
                <th className="px-6 py-4 font-semibold w-40">User ID</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold text-right font-mono text-[10px]">Security Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-100/30 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-700 font-mono">
                      {log.userId}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "font-bold text-xs uppercase",
                      log.action.includes('ERROR') || log.action.includes('REJECTED') ? "text-red-400" : "text-blue-400"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 italic text-xs max-w-md truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-[10px] text-slate-600 group-hover:text-emerald-500/50 transition-colors">
                      {log.hash}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic">
                    {logs.length === 0 ? 'No system events recorded.' : 'No matching logs found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
