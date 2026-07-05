import express from "express";
import path from "path";
import multer from "multer";
import Papa from "papaparse";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin (only if vars exist to prevent crash without them)
if (process.env.FIREBASE_PROJECT_ID && getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace literal \n with actual newlines if provided in env var string
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log("Firebase Admin Initialized");
  } catch (err) {
    console.error("Firebase Admin Initialization Error:", err);
  }
}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// API routes go here FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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

        const tb = data.map(row => {
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
        entity.trialBalance = tb;
      } else {
        entity.trialBalance = entity.trialBalance || [];
      }
      return entity;
    });

    // Math Logic
    const eliminations: any[] = [];
    const parents = entities.filter((e: any) => e.type === 'Parent');
    const subsidiaries = entities.filter((e: any) => e.type === 'Subsidiary');

    subsidiaries.forEach((sub: any) => {
      parents.forEach((parent: any) => {
        const investmentAccounts = parent.trialBalance.filter((acc: any) => 
          acc.accountType === 'Asset' && 
          (acc.accountName.toLowerCase().includes('investment') || acc.accountName.toLowerCase().includes('shares in')) &&
          (acc.accountName.toLowerCase().includes(sub.name.toLowerCase().split(' ')[0]) || sub.name.toLowerCase().includes(acc.accountName.toLowerCase().split(' ').pop() || ''))
        );

        investmentAccounts.forEach((acc: any) => {
          let totalEliminatedEquity = 0;
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

          const subEquityAccounts = sub.trialBalance.filter((sa: any) => sa.accountType === 'Equity');
          subEquityAccounts.forEach((se: any) => {
            const eliminatedAmount = se.credit * (sub.ownershipPercentage / 100);
            if (eliminatedAmount !== 0) {
              totalEliminatedEquity += eliminatedAmount;
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

          const goodwill = acc.debit - totalEliminatedEquity;
          if (Math.abs(goodwill) > 0.01) {
            eliminations.push({
              id: uuidv4(),
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

    // Intercompany
    entities.forEach((entity: any) => {
      entity.trialBalance.filter((e: any) => e.isIntercompany).forEach((entry: any) => {
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
            id: uuidv4(),
            type: 'NCI',
            description: `NCI Allocation for ${sub.name} (${(nciPercent * 100).toFixed(0)}%)`,
            debit: 0,
            credit: nciValue,
            accountName: 'Non-Controlling Interest (BS)',
            accountType: 'Equity',
            timestamp: new Date().toISOString()
          });
          
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

    // Save to Firestore if initialized
    if (getApps().length > 0) {
      try {
        const db = getFirestore();
        await db.collection("consolidations").add({
          timestamp: FieldValue.serverTimestamp(),
          entities: entities,
          eliminations: eliminations
        });
      } catch (dbErr) {
        console.error("Firestore save error:", dbErr);
      }
    }

    res.json({ entities, eliminations });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
