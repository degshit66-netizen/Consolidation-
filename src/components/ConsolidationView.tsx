/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calculator, Play, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useConsolidation } from '../context/ConsolidationContext';
import { formatCurrency, cn } from '../lib/utils';

export default function ConsolidationView() {
  const { entities, eliminations, runConsolidation, lastConsolidationAt, loadSampleData } = useConsolidation();
  const [showSuccess, setShowSuccess] = React.useState(false);
  
  const allValidated = entities.length > 0 && entities.every(e => e.isValidated);
  const totalEliminations = eliminations.reduce((s, e) => s + (e.debit - e.credit), 0);
  const isBalanced = Math.abs(totalEliminations) < 0.01;

  const handleExecute = () => {
    runConsolidation();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">STRATIFY Consolidation Engine</h1>
            <p className="text-slate-400 text-sm mt-1">Execute IFRS-10 elimination journals and NCI computations.</p>
          </div>
        </div>

        <div className="bg-[#0f1218] border border-slate-800 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
            <Calculator size={40} className="text-slate-700" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Entity Data Found</h2>
          <p className="text-slate-500 max-w-md mb-8 italic">
            "Consolidation is the process of combining the financial results of several subsidiary companies into the combined financial results of the parent company."
          </p>
          <button 
            onClick={loadSampleData}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Load Enterprise Sample Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">STRATIFY Consolidation Engine</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-400 text-sm">Execute IFRS-10 elimination journals and NCI computations with enterprise-grade precision.</p>
            {lastConsolidationAt && (
              <>
                <div className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                  Last Run: {new Date(lastConsolidationAt).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {showSuccess && (
            <span className="text-emerald-500 text-xs font-bold animate-pulse">Consolidation Successful</span>
          )}
          <button 
            onClick={handleExecute}
            disabled={!allValidated}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Play size={18} />
            Execute Consolidation
          </button>
        </div>
      </div>

      {!allValidated && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
          <Info className="text-amber-500 mt-0.5" size={20} />
          <div>
            <h4 className="text-amber-500 font-bold text-sm uppercase tracking-wider">Engine Paused</h4>
            <p className="text-amber-500/80 text-sm mt-1">All entities must have validated trial balances before the consolidation engine can be executed.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0f1218] border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Elimination Journals</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Net Variance:</span>
                <span className={cn("text-[10px] font-mono", isBalanced ? "text-green-500" : "text-red-500")}>
                  {formatCurrency(totalEliminations)}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="px-6 py-4 font-semibold">Description</th>
                    <th className="px-6 py-4 font-semibold">Account</th>
                    <th className="px-6 py-4 font-semibold text-right">Debit</th>
                    <th className="px-6 py-4 font-semibold text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {eliminations.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-200">{entry.description}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{entry.type} Journal</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{entry.accountName}</td>
                      <td className="px-6 py-4 text-right font-mono text-blue-400">{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</td>
                    </tr>
                  ))}
                  {eliminations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-600 italic">
                        No journals generated. Run the engine to process data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f1218] border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Validation Checklist</h3>
            <div className="space-y-4">
              <CheckItem label="IFRS-10 Compliance Scan" done={eliminations.length > 0} />
              <CheckItem label="Investment Elimination" done={eliminations.some(e => e.type === 'Investment')} />
              <CheckItem label="Intercompany Matching" done={eliminations.some(e => e.type === 'Intercompany')} />
              <CheckItem label="NCI Allocation Protocol" done={eliminations.some(e => e.type === 'NCI')} />
              <CheckItem label="Zero-Variance Verification" done={isBalanced && eliminations.length > 0} />
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-600/20 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calculator size={80} />
            </div>
            <h3 className="text-blue-400 text-xs font-bold uppercase tracking-tighter mb-2">Engine Integrity</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              The consolidation engine strictly enforces the aggregation rules of IAS 21 and IFRS 10. Mismatched intercompany balances will trigger a mandatory parking in the Suspense clearing account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", done ? "text-slate-300" : "text-slate-500")}>{label}</span>
      {done ? (
        <CheckCircle className="text-emerald-500" size={16} />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-slate-800" />
      )}
    </div>
  );
}
