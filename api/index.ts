import express from "express";
import path from "path";
import multer from "multer";
import Papa from "papaparse";
import dotenv from "dotenv";

dotenv.config();

import { GoogleGenAI, Type } from "@google/genai";

// Initialize GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// API routes go here FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/stratify", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvText = req.file.buffer.toString('utf-8');
    
    // Parse CSV to ensure it's valid and get headers
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return res.status(400).json({ error: "Invalid CSV file" });
    }

    const headers = parsed.meta.fields || [];
    
    // Prepare prompt for Gemini
    const prompt = `
      You are an Expert Financial Systems Architect and Full-Stack Developer with deep expertise in IFRS Accounting (specifically IFRS 10).
      I am providing a combined financial export CSV. Your task is to intelligently extract and separate it into two entities: Entity A (Parent) and Entity B (Subsidiary).

      Rules:
      1. Analyze account names, descriptions, and values to distinguish Parent vs. Subsidiary records.
      2. Identify intercompany balances (Receivables/Payables, Investment in Sub).
      3. Generate two balanced CSV strings (Debits must equal Credits for each).
      4. Output as a JSON object with keys: "parentCsv" and "subCsv".
      5. Include headers: Account, Type, Debit, Credit, MappedTo.

      Combined Data:
      ${csvText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            parentCsv: { type: Type.STRING, description: "Balanced CSV for Entity A" },
            subCsv: { type: Type.STRING, description: "Balanced CSV for Entity B" }
          },
          required: ["parentCsv", "subCsv"]
        }
      }
    });

    let aiResultStr = response.text || "";
    if (!aiResultStr) throw new Error("AI returned empty response");
    
    // Remove markdown code block if present
    aiResultStr = aiResultStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const aiData = JSON.parse(aiResultStr);
    res.json({ 
      parentCsv: aiData.parentCsv, 
      subCsv: aiData.subCsv 
    });
  } catch (err: any) {
    console.error("Stratify AI Error:", err);
    res.status(500).json({ error: err.message || "Failed to process file with AI" });
  }
});

app.post("/api/consolidate", upload.array('files'), async (req, res) => {
  try {
    const metadataStr = req.body.metadata;
    if (!metadataStr) {
      return res.status(400).json({ error: "Missing metadata" });
    }
    let entities = JSON.parse(metadataStr);
    const files = req.files as Express.Multer.File[];

    // Parse CSVs and attach to entities
    entities = entities.map((entity: any) => {
      const file = files?.find((f: any) => f.originalname === entity.fileName);
      if (file) {
        const csvText = file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().trim()
        });
        const data = parsed.data as any[];

        let totalDebit = 0;
        let totalCredit = 0;

        const tb = data.map(row => {
          const rawType = (row['type'] || row['accounttype'] || '').toString();
          let type: any = undefined;
          if (rawType.toLowerCase().includes('asset')) type = 'Asset';
          else if (rawType.toLowerCase().includes('liabilit')) type = 'Liability';
          else if (rawType.toLowerCase().includes('equit')) type = 'Equity';
          else if (rawType.toLowerCase().includes('revenu')) type = 'Revenue';
          else if (rawType.toLowerCase().includes('expens')) type = 'Expense';

          const debit = parseFloat((row['debit'] || '0').toString().replace(/,/g, '')) || 0;
          const credit = parseFloat((row['credit'] || '0').toString().replace(/,/g, '')) || 0;
          totalDebit += debit;
          totalCredit += credit;

          return {
            accountCode: (row['account code'] || row['code'] || row['accountcode'] || '').toString(),
            accountName: (row['account name'] || row['name'] || row['accountname'] || '').toString(),
            accountType: type,
            debit,
            credit,
            isIntercompany: String(row['intercompany'] || row['isintercompany']).toLowerCase() === 'yes' || row['isintercompany'] === 'true' || row['isintercompany'] === true,
            icPartner: row['ic partner'] || row['icpartner'],
            mappedTo: row['mappedto'] || row['mappedTo'] || (row['account name'] || row['name'] || row['accountname'] || '').toString()
          };
        });

        // Validation Check 1: Double-Entry Balance
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          throw new Error(`Trial Balance for ${entity.name} does not balance. Total Debits: ${totalDebit}, Total Credits: ${totalCredit}`);
        }

        entity.trialBalance = tb;
      } else {
        entity.trialBalance = entity.trialBalance || [];
      }
      return entity;
    });

    // Math Logic
    const eliminations: any[] = [];
    const parents = entities.filter((e: any) => e.type === 'Parent');
    const subsidiaries = entities.filter((e: any) => e.type === 'Subsidiary' && e.ownershipPercentage >= 50);

    const consolidatedEntities = [...parents, ...subsidiaries];

    subsidiaries.forEach((sub: any) => {
      parents.forEach((parent: any) => {
        // Investment elimination using mappedTo
        const investmentAccounts = parent.trialBalance.filter((acc: any) => 
          (acc.mappedTo === 'Investments' || acc.accountName.toLowerCase().includes('investment')) &&
          (acc.accountName.toLowerCase().includes(sub.name.toLowerCase().split(' ')[0]) || sub.name.toLowerCase().includes(acc.accountName.toLowerCase().split(' ').pop() || ''))
        );

        investmentAccounts.forEach((acc: any) => {
          let totalEliminatedEquity = 0;
          eliminations.push({
            id: crypto.randomUUID(),
            type: 'Investment',
            description: `Elimination of investment in ${sub.name}`,
            debit: 0,
            credit: acc.debit,
            accountName: acc.mappedTo || acc.accountName,
            accountType: 'Asset',
            timestamp: new Date().toISOString()
          });

          // Eliminate Sub Equity
          const subEquityAccounts = sub.trialBalance.filter((sa: any) => sa.accountType === 'Equity');
          subEquityAccounts.forEach((se: any) => {
            const eliminatedAmount = se.credit * (sub.ownershipPercentage / 100);
            if (eliminatedAmount !== 0) {
              totalEliminatedEquity += eliminatedAmount;
              eliminations.push({
                id: crypto.randomUUID(),
                type: 'Investment',
                description: `Elimination of Sub Equity - ${sub.name} (${se.accountName})`,
                debit: eliminatedAmount,
                credit: 0,
                accountName: se.mappedTo || se.accountName,
                accountType: 'Equity',
                timestamp: new Date().toISOString()
              });
            }
          });

          // Goodwill
          const goodwill = acc.debit - totalEliminatedEquity;
          if (Math.abs(goodwill) > 0.01) {
            eliminations.push({
              id: crypto.randomUUID(),
              type: 'Investment',
              description: `Recognition of Goodwill on Acquisition of ${sub.name}`,
              debit: goodwill > 0 ? goodwill : 0,
              credit: goodwill > 0 ? 0 : Math.abs(goodwill),
              accountName: 'Goodwill (Asset)',
              accountType: 'Asset',
              timestamp: new Date().toISOString()
            });
          }
        });
      });
    });

    // Intercompany Matching logic using mappedTo
    const icReceivables = [];
    const icPayables = [];

    consolidatedEntities.forEach(e => {
      e.trialBalance.forEach(entry => {
        if (entry.mappedTo === 'IC Receivable') icReceivables.push({ ...entry, entity: e.name });
        if (entry.mappedTo === 'IC Payable') icPayables.push({ ...entry, entity: e.name });
      });
    });

    // Automated IC Elimination
    consolidatedEntities.forEach((entity: any) => {
      entity.trialBalance.filter((e: any) => e.isIntercompany || e.mappedTo?.startsWith('IC ')).forEach((entry: any) => {
        eliminations.push({
          id: crypto.randomUUID(),
          type: 'Intercompany',
          description: `Elimination of IC ${entry.accountName} - ${entity.name}`,
          debit: entry.credit,
          credit: entry.debit,
          accountName: entry.mappedTo || entry.accountName,
          accountType: entry.accountType || (entry.mappedTo?.includes('Payable') ? 'Liability' : 'Asset'),
          timestamp: new Date().toISOString()
        });
      });
    });

    // NCI
    subsidiaries.forEach((sub: any) => {
      const nciPercent = (100 - sub.ownershipPercentage) / 100;
      if (nciPercent > 0) {
        const equity = sub.trialBalance
          .filter((item: any) => item.accountType === 'Equity' || item.accountType === 'Revenue' || item.accountType === 'Expense')
          .reduce((sum: number, item: any) => sum + (item.credit - item.debit), 0);
        
        const nciValue = equity * nciPercent;
        if (Math.abs(nciValue) > 0.01) {
          eliminations.push({
            id: crypto.randomUUID(),
            type: 'NCI',
            description: `NCI Allocation for ${sub.name} (${(nciPercent * 100).toFixed(0)}%)`,
            debit: 0,
            credit: nciValue,
            accountName: 'Non-Controlling Interest (BS)',
            accountType: 'Equity',
            timestamp: new Date().toISOString()
          });
          
          eliminations.push({
            id: crypto.randomUUID(),
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

    res.json({ entities, eliminations });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
