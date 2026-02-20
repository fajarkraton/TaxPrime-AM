import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';

export const onMonthlyReport = onSchedule('0 1 1 * *', async (event) => {
    console.log('Menjalankan pembuatan laporan bulanan ke Google Sheets...');

    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_REPORT_ID;

    if (!credentialsRaw || !spreadsheetId || spreadsheetId === 'PLACEHOLDER_SHEET_ID') {
        console.error('Kredensial atau ID Spreadsheet tidak valid/belum disetel. Laporan digagalkan.');
        return;
    }

    let credentials;
    try {
        credentials = JSON.parse(credentialsRaw);
    } catch (e) {
        console.error('Gagal parsing GOOGLE_SERVICE_ACCOUNT_KEY JSON', e);
        return;
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const db = admin.firestore();
    const now = new Date();

    // Rentang bulan lalu
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    try {
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
                reportMonth,
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

        console.log(`Laporan bulanan berhasil disisipkan di range: ${response.data.updates?.updatedRange}`);

    } catch (error) {
        console.error('Gagal mengkompilasi laporan atau menulis ke Sheets:', error);
    }
});
