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
  updateTrialBalance: (entityId: string, tb: TrialBalanceEntry[]) => void;
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
    setState(prev => {
      const entity = prev.entities.find(e => e.id === id);
      if (entity) {
        addLog('ENTITY_DELETED', `Entity ${entity.name} removed from registry.`);
      }
      return {
        ...prev,
        entities: prev.entities.filter(e => e.id !== id)
      };
    });
  }, [addLog]);

  const updateTrialBalance = useCallback((entityId: string, tb: TrialBalanceEntry[]) => {
    // Validate Debits == Credits
    const totalDebits = Math.round(tb.reduce((sum, item) => sum + item.debit, 0) * 100) / 100;
    const totalCredits = Math.round(tb.reduce((sum, item) => sum + item.credit, 0) * 100) / 100;
    const diff = Math.abs(totalDebits - totalCredits);
    const isValid = diff < 0.01;

    setState(prev => ({
      ...prev,
      entities: prev.entities.map(e => 
        e.id === entityId 
          ? { ...e, trialBalance: tb, isValidated: isValid, lastUploadAt: new Date().toISOString() } 
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

  const runConsolidation = useCallback(() => {
    const { entities } = state;
    if (entities.length === 0) return;

    const eliminations: EliminationEntry[] = [];
    
    // 1. Investment in Subsidiaries Elimination
    const parents = entities.filter(e => e.type === 'Parent');
    const subsidiaries = entities.filter(e => e.type === 'Subsidiary');

    subsidiaries.forEach(sub => {
      // Find investment account in parent that matches this sub
      parents.forEach(parent => {
        const investmentAccounts = parent.trialBalance.filter(acc => 
          acc.accountType === 'Asset' && 
          (acc.accountName.toLowerCase().includes('investment') || acc.accountName.toLowerCase().includes('shares in')) &&
          (acc.accountName.toLowerCase().includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes(acc.accountName.toLowerCase().split(' ').pop() || ''))
        );

        investmentAccounts.forEach(acc => {
          eliminations.push({
            id: uuidv4(),
            type: 'Investment',
            description: `Elimination of investment in ${sub.name}`,
            debit: 0,
            credit: acc.debit,
            accountName: acc.accountName,
            accountType: 'Asset',
            timestamp: new Date().toISOString()
          });

          // Offset Sub's Equity (simplified: eliminate common shares up to ownership %)
          const subEquityAccounts = sub.trialBalance.filter(sa => sa.accountType === 'Equity');
          subEquityAccounts.forEach(se => {
            const eliminatedAmount = se.credit * (sub.ownershipPercentage / 100);
            if (eliminatedAmount !== 0) {
              eliminations.push({
                id: uuidv4(),
                type: 'Investment',
                description: `Elimination of Sub Equity - ${sub.name} (${se.accountName})`,
                debit: eliminatedAmount,
                credit: 0,
                accountName: se.accountName,
                accountType: 'Equity',
                timestamp: new Date().toISOString()
              });
            }
          });
        });
      });
    });

    // 2. Intercompany Eliminations (Offset every IC account)
    entities.forEach(entity => {
      entity.trialBalance.filter(e => e.isIntercompany).forEach(entry => {
        eliminations.push({
          id: uuidv4(),
          type: 'Intercompany',
          description: `Elimination of IC ${entry.accountName} - ${entity.name}`,
          debit: entry.credit,
          credit: entry.debit,
          accountName: entry.accountName,
          accountType: entry.accountType || 'Liability',
          timestamp: new Date().toISOString()
        });
      });
    });

    // 3. NCI Calculations (Allocation of Equity to NCI)
    subsidiaries.forEach(sub => {
      const nciPercent = (100 - sub.ownershipPercentage) / 100;
      if (nciPercent > 0) {
        // Equity accounts usually have credit balances
        const equity = sub.trialBalance
          .filter(item => item.accountType === 'Equity' || item.accountType === 'Revenue' || item.accountType === 'Expense')
          .reduce((sum, item) => sum + (item.credit - item.debit), 0);
        
        const nciValue = equity * nciPercent;

        if (Math.abs(nciValue) > 0.01) {
          eliminations.push({
            id: uuidv4(),
            type: 'NCI',
            description: `NCI Allocation for ${sub.name} (${(nciPercent * 100).toFixed(0)}%)`,
            debit: 0,
            credit: nciValue,
            accountName: 'Non-Controlling Interest (BS)',
            accountType: 'Equity',
            timestamp: new Date().toISOString()
          });
          
          // Offsetting debit to equity/earnings (simplified)
          eliminations.push({
            id: uuidv4(),
            type: 'NCI',
            description: `NCI Earnings Allocation for ${sub.name}`,
            debit: nciValue,
            credit: 0,
            accountName: 'Consolidated Retained Earnings (NCI Portion)',
            accountType: 'Equity',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    setState(prev => ({ ...prev, eliminations, lastConsolidationAt: new Date().toISOString() }));
    addLog('CONSOLIDATION_RUN', `Engine executed for ${entities.length} entities. ${eliminations.length} journals generated.`);
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
