"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMonthlyReport = void 0;
const https_1 = require("firebase-functions/v2/https");
const googleapis_1 = require("googleapis");
const admin = __importStar(require("firebase-admin"));
exports.testMonthlyReport = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    console.log('Menjalankan pembuatan laporan bulanan (Testing Manual)...');
    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_REPORT_ID;
    if (!credentialsRaw || !spreadsheetId || spreadsheetId === 'PLACEHOLDER_SHEET_ID') {
        const msg = 'Kredensial atau ID Spreadsheet tidak valid/belum disetel.';
        console.error(msg);
        res.status(500).send(msg);
        return;
    }
    let credentials;
    try {
        credentials = JSON.parse(credentialsRaw);
    }
    catch (e) {
        console.error('Gagal parsing GOOGLE_SERVICE_ACCOUNT_KEY JSON', e);
        res.status(500).send('Invalid JSON Kredensial');
        return;
    }
    try {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        const db = admin.firestore();
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const newAssetsSnap = await db.collection('assets')
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(firstDayLastMonth))
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(firstDayThisMonth))
            .get();
        const auditSnap = await db.collection('auditTrails')
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(firstDayLastMonth))
            .where('timestamp', '<', admin.firestore.Timestamp.fromDate(firstDayThisMonth))
            .get();
        const reportMonth = `${firstDayLastMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
        const rowData = [
            [
                `${reportMonth} (TEST)`,
                newAssetsSnap.size,
                auditSnap.size,
                new Date().toISOString()
            ]
        ];
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Laporan Bulanan!A:D',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rowData,
            },
        });
        res.status(200).send(`Berhasil. Diperbarui di range: ${response.data.updates?.updatedRange}`);
    }
    catch (error) {
        console.error('Gagal mengkompilasi laporan atau menulis ke Sheets:', error);
        res.status(500).send(error.message);
    }
});
//# sourceMappingURL=test-monthly-report.js.map