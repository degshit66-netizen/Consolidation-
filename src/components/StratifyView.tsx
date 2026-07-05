import React, { useState, useRef } from 'react';
import { Wand2, UploadCloud, FileSpreadsheet, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface StratifyResult {
  parentCsv: string;
  subCsv: string;
}

export default function StratifyView() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StratifyResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
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
        throw new Error(errorData.error || 'Failed to process file');
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
            <Wand2 className="text-blue-500" />
            AI Stratify
          </h1>
          <p className="text-slate-500 text-sm mt-1">Upload QuickBooks Trial Balance, GL, or Journal to intelligently separate Parent and Subsidiary data.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all",
            file ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
          )}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <FileSpreadsheet size={48} className="text-blue-500 mb-4" />
              <p className="text-slate-900 font-semibold">{file.name}</p>
              <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResult(null);
                }}
                className="text-red-500 text-sm mt-2 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud size={48} className="text-slate-400 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Financial Export</h3>
              <p className="text-slate-500 text-sm">Drag and drop your QuickBooks CSV file here, or click to browse</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all shadow-md",
              !file || loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95"
            )}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing with AI...
              </>
            ) : (
              <>
                <Wand2 size={20} />
                Stratify with AI
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle2 className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Extraction Complete</h2>
              <p className="text-slate-500 text-sm">AI has successfully separated the data into two entities.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center text-center">
              <FileSpreadsheet size={32} className="text-purple-500 mb-3" />
              <h4 className="font-bold text-slate-900 mb-1">Parent Entity Data</h4>
              <p className="text-xs text-slate-500 mb-4">Extracted parent company records</p>
              <button 
                onClick={() => downloadCsv(result.parentCsv, 'parent_data.csv')}
                className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-full justify-center"
              >
                <Download size={16} />
                Download CSV
              </button>
            </div>
            
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center text-center">
              <FileSpreadsheet size={32} className="text-blue-500 mb-3" />
              <h4 className="font-bold text-slate-900 mb-1">Subsidiary Entity Data</h4>
              <p className="text-xs text-slate-500 mb-4">Extracted subsidiary records</p>
              <button 
                onClick={() => downloadCsv(result.subCsv, 'subsidiary_data.csv')}
                className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-full justify-center"
              >
                <Download size={16} />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
