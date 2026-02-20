"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetMaintenanceCalendar = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const googleapis_1 = require("googleapis");
exports.onAssetMaintenanceCalendar = (0, firestore_1.onDocumentUpdated)('assets/{assetId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    // Pastikan ini adalah transisi *masuk* ke status perawatan
    if (afterData?.status !== 'maintenance' || beforeData?.status === 'maintenance') {
        return;
    }
    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!credentialsRaw || !calendarId || calendarId === 'PLACEHOLDER_CALENDAR_ID') {
        console.log('Variabel kalender atau kredensial belum di-setup, membatalkan event kalender.');
        return;
    }
    let credentials;
    try {
        credentials = JSON.parse(credentialsRaw);
    }
    catch (e) {
        console.error('Gagal parsing GOOGLE_SERVICE_ACCOUNT_KEY JSON', e);
        return;
    }
    try {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar.events'],
        });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        // Mulai event hari ini
        const startDate = new Date();
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + 1); // Set 1 jam secara default apabila maintenanceDate tidak dispesifikkan
        const eventResource = {
            summary: `🛠 Maintenance Aset: ${afterData.name || 'Unknown'}`,
            description: `Perawatan aset dimulai.\n\nNomor Seri: ${afterData.serialNumber}\nKode: ${afterData.assetCode}\n\nOtomatis dari ITAMS.`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: 'Asia/Jakarta',
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: 'Asia/Jakarta',
            },
            colorId: '11', // Tanda warna merah/urgency di Kalender (opsional)
        };
        const res = await calendar.events.insert({
            calendarId,
            requestBody: eventResource,
        });
        console.log('Event Maintenance Kalender Dibuat:', res.data.htmlLink);
    }
    catch (error) {
        console.error('Gagal mengontak Google Calendar API:', error);
    }
});
//# sourceMappingURL=on-asset-maintenance.js.map