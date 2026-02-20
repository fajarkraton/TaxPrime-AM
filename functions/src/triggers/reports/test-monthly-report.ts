import { onRequest } from 'firebase-functions/v2/https';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';

export const testMonthlyReport = onRequest({ cors: true }, async (req, res) => {
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
    } catch (e) {
        console.error('Gagal parsing GOOGLE_SERVICE_ACCOUNT_KEY JSON', e);
        res.status(500).send('Invalid JSON Kredensial');
        return;
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
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
    } catch (error: any) {
        console.error('Gagal mengkompilasi laporan atau menulis ke Sheets:', error);
        res.status(500).send(error.message);
    }
});
