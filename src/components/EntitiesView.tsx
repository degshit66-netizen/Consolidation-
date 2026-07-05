/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Upload, Plus, AlertCircle, CheckCircle2, FileText, Trash2, Building2, X } from 'lucide-react';
import { useConsolidation } from '../context/ConsolidationContext';
import { cn, formatCurrency } from '../lib/utils';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TrialBalanceEntry } from '../types/finance';

export default function EntitiesView() {
  const { entities, addEntity, updateTrialBalance, addLog, loadSampleData, deleteEntity } = useConsolidation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Parent' | 'Subsidiary'>('Subsidiary');
  const [newOwnership, setNewOwnership] = useState(100);

  const handleFileUpload = (entityId: string, file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const entity = entities.find(e => e.id === entityId);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        // Normalize keys for XLSX as well
        const jsonData = jsonDataRaw.map(row => {
          const normalized: any = {};
          Object.keys(row).forEach(key => {
            normalized[key.toLowerCase().trim()] = row[key];
          });
          return normalized;
        });
        
        // Currency Consistency Check
        const fileCurrency = jsonData[0]?.['currency'];
        if (fileCurrency && entity && fileCurrency !== entity.currency) {
          addLog('CURRENCY_MISMATCH', `Currency mismatch detected! File: ${fileCurrency} vs Entity: ${entity.currency}.`);
        }

        const tb: TrialBalanceEntry[] = jsonData.map(row => {
          const rawType = (row['type'] || row['accounttype'] || '').toString();
          let type: any = undefined;
          if (rawType.toLowerCase().includes('asset')) type = 'Asset';
          else if (rawType.toLowerCase().includes('liabilit')) type = 'Liability';
          else if (rawType.toLowerCase().includes('equit')) type = 'Equity';
          else if (rawType.toLowerCase().includes('revenu')) type = 'Revenue';
          else if (rawType.toLowerCase().includes('expens')) type = 'Expense';

          return {
            accountCode: (row['account code'] || row['code'] || row['accountcode'] || '').toString(),
            accountName: (row['account name'] || row['name'] || row['accountname'] || '').toString(),
            accountType: type,
            debit: parseFloat((row['debit'] || '0').toString().replace(/,/g, '')) || 0,
            credit: parseFloat((row['credit'] || '0').toString().replace(/,/g, '')) || 0,
            isIntercompany: String(row['intercompany'] || row['isintercompany']).toLowerCase() === 'yes' || row['isintercompany'] === 'true' || row['isintercompany'] === true,
            icPartner: row['ic partner'] || row['icpartner']
          };
        });
        
        const csvString = Papa.unparse(jsonData);
        updateTrialBalance(entityId, tb, csvString, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim(),
        complete: (results) => {
          const data = results.data as any[];
          
          // Currency Consistency Check
          const fileCurrency = data[0]?.['currency'];
          if (fileCurrency && entity && fileCurrency !== entity.currency) {
            addLog('CURRENCY_MISMATCH', `Currency mismatch detected! File: ${fileCurrency} vs Entity: ${entity.currency}.`);
          }

          const tb: TrialBalanceEntry[] = data.map(row => {
            const rawType = (row['type'] || row['accounttype'] || '').toString();
            let type: any = undefined;
            if (rawType.toLowerCase().includes('asset')) type = 'Asset';
            else if (rawType.toLowerCase().includes('liabilit')) type = 'Liability';
            else if (rawType.toLowerCase().includes('equit')) type = 'Equity';
            else if (rawType.toLowerCase().includes('revenu')) type = 'Revenue';
            else if (rawType.toLowerCase().includes('expens')) type = 'Expense';

            return {
              accountCode: (row['account code'] || row['code'] || row['accountcode'] || '').toString(),
              accountName: (row['account name'] || row['name'] || row['accountname'] || '').toString(),
              accountType: type,
              debit: parseFloat((row['debit'] || '0').toString().replace(/,/g, '')) || 0,
              credit: parseFloat((row['credit'] || '0').toString().replace(/,/g, '')) || 0,
              isIntercompany: String(row['intercompany'] || row['isintercompany']).toLowerCase() === 'yes' || row['isintercompany'] === 'true' || row['isintercompany'] === true,
              icPartner: row['ic partner'] || row['icpartner']
            };
          });
          
          file.text().then(text => {
            updateTrialBalance(entityId, tb, text, file.name);
          }).catch(err => {
            updateTrialBalance(entityId, tb); // fallback
          });
        },
        error: (error) => {
          addLog('UPLOAD_ERROR', `Failed to parse file: ${error.message}`);
        }
      });
    }
  };

  const [viewingEntity, setViewingEntity] = useState<string | null>(null);

  const activeEntityData = entities.find(e => e.id === viewingEntity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entities & Data Ingestion</h1>
          <p className="text-slate-500 text-sm mt-1">Manage parent and subsidiary trial balances for consolidation.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              loadSampleData();
            }}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Load Sample
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={18} />
            Add Entity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entities.map(entity => (
          <div key={entity.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden group">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{entity.name}</h3>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    entity.type === 'Parent' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                  )}>
                    {entity.type}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Ownership: {entity.ownershipPercentage}% | {entity.currency}</p>
              </div>
              <div className="flex items-start gap-2">
                {entity.isValidated ? (
                  <CheckCircle2 className="text-green-500" size={20} />
                ) : (
                  <AlertCircle className="text-amber-500" size={20} />
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEntity(entity.id);
                  }}
                  className="p-1 hover:bg-red-500/10 rounded text-slate-600 hover:text-red-500 transition-colors"
                  title="Delete Entity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {entity.trialBalance.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Total Debits</span>
                    <span className="text-slate-700">{formatCurrency(entity.trialBalance.reduce((s, i) => s + i.debit, 0), entity.currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Total Credits</span>
                    <span className="text-slate-700">{formatCurrency(entity.trialBalance.reduce((s, i) => s + i.credit, 0), entity.currency)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase">Last Upload: {new Date(entity.lastUploadAt!).toLocaleDateString()}</span>
                    <button 
                      onClick={() => setViewingEntity(entity.id)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                      View Data
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg group-hover:border-slate-300 transition-colors">
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload size={24} className="text-slate-600 mb-2" />
                    <span className="text-xs text-slate-500">Upload TB (CSV/XLSX)</span>
                    <input 
                      type="file" 
                      accept=".csv,.xlsx,.xls" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(entity.id, e.target.files[0])}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}

        {entities.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500">
            <Building2 size={48} className="mb-4 opacity-20" />
            <p>No entities defined. Add a parent entity or load sample data to begin.</p>
          </div>
        )}
      </div>

      {/* Data Viewer Modal */}
      {viewingEntity && activeEntityData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-500" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeEntityData.name} - Trial Balance</h2>
                  <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">{activeEntityData.currency} | {activeEntityData.type}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingEntity(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Code</th>
                    <th className="px-6 py-3 font-semibold">Account Name</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold text-right">Debit</th>
                    <th className="px-6 py-3 font-semibold text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeEntityData.trialBalance.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-100/30">
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">{item.accountCode}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200">{item.accountName}</span>
                          {item.isIntercompany && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">IC</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{item.accountType || '—'}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-700">{item.debit > 0 ? formatCurrency(item.debit, activeEntityData.currency) : '—'}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-700">{item.credit > 0 ? formatCurrency(item.credit, activeEntityData.currency) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div className="flex gap-8">
                <div className="text-xs">
                  <span className="text-slate-500 block mb-1">Total Debits</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(activeEntityData.trialBalance.reduce((s, i) => s + i.debit, 0), activeEntityData.currency)}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 block mb-1">Total Credits</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(activeEntityData.trialBalance.reduce((s, i) => s + i.credit, 0), activeEntityData.currency)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  activeEntityData.isValidated ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                  {activeEntityData.isValidated ? 'Balanced' : 'Imbalanced'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Define New Entity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Entity Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={cn(
                    "w-full bg-slate-50 border rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600",
                    entities.some(e => e.name.toLowerCase() === newName.toLowerCase()) ? "border-red-500" : "border-slate-200"
                  )}
                  placeholder="e.g. Acme Holding Corp"
                />
                {entities.some(e => e.name.toLowerCase() === newName.toLowerCase()) && (
                  <p className="text-red-400 text-[10px] mt-1 font-medium">This entity name already exists.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Entity Type</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewType('Parent')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
                      newType === 'Parent' ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 border border-slate-200"
                    )}
                  >
                    Parent
                  </button>
                  <button 
                    onClick={() => setNewType('Subsidiary')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
                      newType === 'Subsidiary' ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 border border-slate-200"
                    )}
                  >
                    Subsidiary
                  </button>
                </div>
              </div>
              {newType === 'Subsidiary' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ownership (%)</label>
                  <input 
                    type="number" 
                    value={newOwnership}
                    onChange={e => setNewOwnership(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (entities.some(e => e.name.toLowerCase() === newName.toLowerCase())) return;
                  addEntity({ name: newName, type: newType, ownershipPercentage: newOwnership, currency: 'CAD' });
                  setShowAddModal(false);
                  setNewName('');
                }}
                disabled={!newName || entities.some(e => e.name.toLowerCase() === newName.toLowerCase())}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Create Entity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
