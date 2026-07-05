/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  ConsolidationState, 
  Entity, 
  COAMapping, 
  EliminationEntry, 
  AuditLog,
  TrialBalanceEntry
} from '../types/finance';
import { v4 as uuidv4 } from 'uuid';
import { generateHash } from '../lib/utils';
import { saveStateToDB, loadStateFromDB } from '../lib/storage';

interface ConsolidationContextType extends ConsolidationState {
  addEntity: (entity: Omit<Entity, 'id' | 'isValidated' | 'trialBalance'>) => void;
  deleteEntity: (id: string) => void;
  updateTrialBalance: (entityId: string, tb: TrialBalanceEntry[], rawCsvData?: string, fileName?: string) => void;
  loadSampleData: () => void;
  runConsolidation: () => void;
  addLog: (action: string, details: string) => void;
  updateSettings: (settings: ConsolidationState['settings']) => void;
}

const ConsolidationContext = createContext<ConsolidationContextType | undefined>(undefined);

export const ConsolidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConsolidationState>({
    entities: [],
    mappings: [],
    eliminations: [],
    logs: [],
    settings: {
      baseCurrency: 'CAD',
      reportingPeriod: '2026-Q2',
    }
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await loadStateFromDB();
        if (savedState) {
          setState(savedState);
        }
      } catch (err) {
        console.error('Failed to load state from IndexedDB', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Save to IndexedDB when state changes
  useEffect(() => {
    if (isLoaded) {
      saveStateToDB(state).catch(err => console.error('Failed to save state to IndexedDB', err));
    }
  }, [state, isLoaded]);

  const addLog = useCallback((action: string, details: string) => {
    const timestamp = new Date().toISOString();
    const newLog: AuditLog = {
      id: uuidv4(),
      timestamp,
      userId: 'CONTROLLER-01',
      action,
      details,
      hash: generateHash(`${timestamp}-${action}-${details}`)
    };
    setState(prev => ({ ...prev, logs: [newLog, ...prev.logs] }));
  }, []);

  const addEntity = useCallback((entityData: Omit<Entity, 'id' | 'isValidated' | 'trialBalance'>) => {
    const newEntity: Entity = {
      ...entityData,
      id: uuidv4(),
      isValidated: false,
      trialBalance: [],
    };
    setState(prev => ({ ...prev, entities: [...prev.entities, newEntity] }));
    addLog('ENTITY_CREATED', `Entity ${newEntity.name} added as ${newEntity.type}`);
  }, [addLog]);

  const deleteEntity = useCallback((id: string) => {
    const entity = state.entities.find(e => e.id === id);
    if (entity) {
      addLog('ENTITY_DELETED', `Entity ${entity.name} removed from registry.`);
    }
    setState(prev => ({
      ...prev,
      entities: prev.entities.filter(e => e.id !== id)
    }));
  }, [state.entities, addLog]);

  const updateTrialBalance = useCallback((entityId: string, tb: TrialBalanceEntry[], rawCsvData?: string, fileName?: string) => {
    // Validate Debits == Credits
    const totalDebits = Math.round(tb.reduce((sum, item) => sum + item.debit, 0) * 100) / 100;
    const totalCredits = Math.round(tb.reduce((sum, item) => sum + item.credit, 0) * 100) / 100;
    const diff = Math.abs(totalDebits - totalCredits);
    const isValid = diff < 0.01;

    setState(prev => ({
      ...prev,
      entities: prev.entities.map(e => 
        e.id === entityId 
          ? { ...e, trialBalance: tb, isValidated: isValid, lastUploadAt: new Date().toISOString(), rawCsvData, fileName } 
          : e
      )
    }));

    if (isValid) {
      addLog('TB_VALIDATED', `Trial Balance for ${entityId.slice(0, 8)} validated. Total: ${totalDebits.toFixed(2)}`);
    } else {
      addLog('TB_REJECTED', `Trial Balance for ${entityId.slice(0, 8)} failed. Out of balance by ${diff.toFixed(2)}`);
    }
  }, [addLog]);

  const loadSampleData = useCallback(() => {
    const parentId = uuidv4();
    const subId = uuidv4();
    
    const sampleEntities: Entity[] = [
      {
        id: parentId,
        name: 'STRATIFY Global Parent',
        type: 'Parent',
        ownershipPercentage: 100,
        currency: 'CAD',
        isValidated: true,
        lastUploadAt: new Date().toISOString(),
        trialBalance: [
          { accountCode: '1000', accountName: 'Cash & Equivalents', accountType: 'Asset', debit: 1250000, credit: 0 },
          { accountCode: '1200', accountName: 'Investment in Stratify Tech', accountType: 'Asset', debit: 450000, credit: 0 },
          { accountCode: '1300', accountName: 'IC Receivable (Tech)', accountType: 'Asset', debit: 75000, credit: 0, isIntercompany: true, icPartner: 'Stratify Tech (80%)' },
          { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'Liability', debit: 0, credit: 325000 },
          { accountCode: '3000', accountName: 'Common Shares', accountType: 'Equity', debit: 0, credit: 1000000 },
          { accountCode: '4000', accountName: 'Retained Earnings', accountType: 'Equity', debit: 0, credit: 450000 },
        ]
      },
      {
        id: subId,
        name: 'Stratify Tech (80%)',
        type: 'Subsidiary',
        ownershipPercentage: 80,
        currency: 'CAD',
        isValidated: true,
        lastUploadAt: new Date().toISOString(),
        trialBalance: [
          { accountCode: '1000', accountName: 'Cash', accountType: 'Asset', debit: 350000, credit: 0 },
          { accountCode: '2000', accountName: 'IC Payable (Parent)', accountType: 'Liability', debit: 0, credit: 75000, isIntercompany: true, icPartner: 'STRATIFY Global Parent' },
          { accountCode: '2100', accountName: 'Bank Loan', accountType: 'Liability', debit: 0, credit: 125000 },
          { accountCode: '3000', accountName: 'Common Shares', accountType: 'Equity', debit: 0, credit: 100000 },
          { accountCode: '3100', accountName: 'Retained Earnings', accountType: 'Equity', debit: 0, credit: 50000 },
        ]
      }
    ];

    setState(prev => ({ ...prev, entities: sampleEntities }));
    addLog('SAMPLE_DATA_LOADED', 'Corporate demonstration payload injected into engine.');
  }, [addLog]);

  const runConsolidation = useCallback(async () => {
    const { entities } = state;
    if (entities.length === 0) return;

    try {
      addLog('CONSOLIDATION_STARTED', 'Initiating server-side consolidation...');
      const formData = new FormData();
      
      const entitiesMetadata = entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        ownershipPercentage: e.ownershipPercentage,
        currency: e.currency,
        fileName: e.fileName,
        trialBalance: e.trialBalance
      }));
      formData.append('metadata', JSON.stringify(entitiesMetadata));

      entities.forEach(e => {
        if (e.rawCsvData && e.fileName) {
          const blob = new Blob([e.rawCsvData], { type: 'text/csv' });
          formData.append('files', blob, e.fileName);
        }
      });

      const response = await fetch('/api/consolidate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server consolidation failed');
      }

      const result = await response.json();
      const newEliminations = result.eliminations || [];
      const updatedEntities = result.entities || entities; // Backend may update TB

      setState(prev => ({
        ...prev,
        entities: updatedEntities,
        eliminations: newEliminations,
        lastConsolidationAt: new Date().toISOString()
      }));
      addLog('CONSOLIDATION_RUN', `Server Engine executed for ${entities.length} entities. ${newEliminations.length} journals generated and saved to Firestore.`);
    } catch (error: any) {
      console.error(error);
      addLog('CONSOLIDATION_FAILED', `Error: ${error.message}`);
    }
  }, [state, addLog]);

  const updateSettings = (settings: ConsolidationState['settings']) => {
    setState(prev => ({ ...prev, settings }));
    addLog('SETTINGS_UPDATED', 'Global engine configuration modified.');
  };

  return (
    <ConsolidationContext.Provider value={{ ...state, addEntity, deleteEntity, updateTrialBalance, loadSampleData, runConsolidation, addLog, updateSettings }}>
      {children}
    </ConsolidationContext.Provider>
  );
};

export const useConsolidation = () => {
  const context = useContext(ConsolidationContext);
  if (!context) throw new Error('useConsolidation must be used within ConsolidationProvider');
  return context;
};
