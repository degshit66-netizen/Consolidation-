import React, { useState, useRef, useMemo } from 'react';
import { 
  Calculator, 
  UploadCloud, 
  FileSpreadsheet, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  PieChart,
  ClipboardList,
  RefreshCw,
  Wand2,
  Download
} from 'lucide-react';
import { useConsolidation } from '../context/ConsolidationContext';
import { cn, formatCurrency } from '../lib/utils';
import { TrialBalanceEntry, AccountType } from '../types/finance';
import Papa from 'papaparse';

export default function FinancialConsolidator() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ parentCsv: string; subCsv: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/stratify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Calculator className="text-blue-600" />
            Consolidated Data Extractor
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Expert AI separation of Parent (Entity A) and Subsidiary (Entity B) per IFRS 10 standards.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all",
              file ? "border-blue-300 bg-blue-50/50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx"
              className="hidden"
            />
            
            {file ? (
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <FileSpreadsheet size={40} className="text-blue-600" />
                </div>
                <p className="text-slate-900 font-bold text-lg">{file.name}</p>
                <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
                  }}
                  className="text-red-500 text-xs font-bold uppercase tracking-wider mt-4 hover:text-red-700 transition-colors"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <UploadCloud size={40} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Upload combined TB or GL</h3>
                <p className="text-slate-500 text-sm max-w-xs">Drag and drop your QuickBooks or ERP export here to begin IFRS extraction</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in zoom-in duration-300">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleExtract}
              disabled={!file || loading}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-xl",
                !file || loading ? "bg-slate-300 cursor-not-allowed shadow-none" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 active:transform active:scale-[0.98]"
              )}
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Expert AI Processing...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Run IFRS Extraction
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ExtractionCard 
            title="Entity A (Parent)" 
            subtitle="Extracted Parent Company records"
            color="purple"
            onDownload={() => downloadCsv(result.parentCsv, 'parent_entity_data.csv')}
          />
          <ExtractionCard 
            title="Entity B (Subsidiary)" 
            subtitle="Extracted Subsidiary records"
            color="blue"
            onDownload={() => downloadCsv(result.subCsv, 'subsidiary_entity_data.csv')}
          />
        </div>
      )}
    </div>
  );
}

function ExtractionCard({ title, subtitle, color, onDownload }: { title: string; subtitle: string; color: 'purple' | 'blue'; onDownload: () => void }) {
  const isPurple = color === 'purple';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center text-center">
        <div className={cn(
          "p-4 rounded-2xl mb-4",
          isPurple ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
        )}>
          <FileSpreadsheet size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1 mb-6">{subtitle}</p>
        <button 
          onClick={onDownload}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border",
            isPurple 
              ? "bg-purple-600 text-white hover:bg-purple-700 border-purple-600 shadow-lg shadow-purple-600/20" 
              : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-lg shadow-blue-600/20"
          )}
        >
          <Download size={18} />
          Download Extracted CSV
        </button>
      </div>
    </div>
  );
}
