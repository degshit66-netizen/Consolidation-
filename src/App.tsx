/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  FilePieChart, 
  ShieldCheck, 
  Settings as SettingsIcon,
  Calculator,
  ChevronRight,
  Menu,
  X,
  Wand2
} from 'lucide-react';
import { ConsolidationProvider, useConsolidation } from './context/ConsolidationContext';
import { cn } from './lib/utils';

// Module Components
import EntitiesView from './components/EntitiesView';
import FinancialConsolidator from './components/FinancialConsolidator';
import ConsolidationView from './components/ConsolidationView';
import ReportsView from './components/ReportsView';
import AuditTrailView from './components/AuditTrailView';
import SettingsView from './components/SettingsView';

type Module = 'Consolidator' | 'Entities' | 'Consolidation' | 'Reports' | 'Audit Trail' | 'Settings';

function Dashboard() {
  const [activeModule, setActiveModule] = useState<Module>('Consolidator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { entities, logs } = useConsolidation();

  const navItems = [
    { name: 'Consolidator', icon: Wand2 },
    { name: 'Entities', icon: Building2, count: entities.length },
    { name: 'Consolidation', icon: Calculator },
    { name: 'Reports', icon: FilePieChart },
    { name: 'Audit Trail', icon: ShieldCheck, count: logs.length },
    { name: 'Settings', icon: SettingsIcon },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'Consolidator': return <FinancialConsolidator />;
      case 'Entities': return <EntitiesView />;
      case 'Consolidation': return <ConsolidationView />;
      case 'Reports': return <ReportsView />;
      case 'Audit Trail': return <AuditTrailView />;
      case 'Settings': return <SettingsView />;
      default: return <EntitiesView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-200">
          <img 
            src="https://i.postimg.cc/GhCPbwdn/1782659487700.png" 
            alt="Stratify Logo" 
            className="w-8 h-8 object-contain"
            referrerPolicy="no-referrer"
          />
          {isSidebarOpen && (
            <span className="font-bold text-lg tracking-tight text-slate-900">STRATIFY</span>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveModule(item.name as Module)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeModule === item.name 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{item.name}</span>
                  {item.count !== undefined && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-widest">
            <span>Enterprise Platform</span>
            <ChevronRight size={14} />
            <span className="text-blue-600">STRATIFY {activeModule}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-600 uppercase tracking-tighter">System Live: IFRS-10 Ready</span>
            </div>
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold border border-slate-200 text-slate-600">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {renderModule()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ConsolidationProvider>
      <Dashboard />
    </ConsolidationProvider>
  );
}

