/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface COAMapping {
  sourceAccount: string;
  targetAccount: string;
  type: AccountType;
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType?: AccountType;
  debit: number;
  credit: number;
  isIntercompany?: boolean;
  icPartner?: string;
}

export interface Entity {
  id: string;
  name: string;
  type: 'Parent' | 'Subsidiary';
  ownershipPercentage: number;
  currency: string;
  trialBalance: TrialBalanceEntry[];
  rawCsvData?: string;
  fileName?: string;
  lastUploadAt?: string;
  isValidated: boolean;
}

export interface EliminationEntry {
  id: string;
  type: 'Intercompany' | 'NCI' | 'Investment';
  description: string;
  debit: number;
  credit: number;
  accountName: string;
  accountType: AccountType;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
  hash: string;
}

export interface ConsolidationState {
  entities: Entity[];
  mappings: COAMapping[];
  eliminations: EliminationEntry[];
  logs: AuditLog[];
  settings: {
    baseCurrency: string;
    reportingPeriod: string;
  };
  lastConsolidationAt?: string;
}
