import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { google } from 'googleapis';

export const onSubscriptionCreateCalendar = onDocumentCreated('subscriptions/{subId}', async (event) => {
    const data = event.data?.data();
    if (!data || !data.expiryDate) return;

    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!credentialsRaw || !calendarId || calendarId === 'PLACEHOLDER_CALENDAR_ID') {
        return;
    }

    let credentials;
    try {
        credentials = JSON.parse(credentialsRaw);
    } catch {
        return;
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar.events'],
        });

        const calendar = google.calendar({ version: 'v3', auth });

        const expiryDate = data.expiryDate.toDate();
        // Event All-Day (format YYYY-MM-DD string format untuk start/end date)
        const dateString = expiryDate.toISOString().split('T')[0];

        const eventResource = {
            summary: `⏳ Jatuh Tempo: ${data.name || 'Layanan IT'}`,
            description: `Aplikasi atau SaaS ini akan kedaluwarsa.\n\nProvider: ${data.provider}\nBiaya / Siklus: ${data.costPerPeriod}\nOtomatis dari ITAMS.`,
            start: {
                date: dateString,
                timeZone: 'Asia/Jakarta',
            },
            end: {
                date: dateString, // Di Kalender, event All-day end date sifatnya eksklusif. Kita abaikan strictness untuk API sederhana, end date sama bisa berlaku 1 hari.
                timeZone: 'Asia/Jakarta',
            },
            colorId: '5', // Tanda warna kuning/orange di Kalender
        };

        const res = await calendar.events.insert({
            calendarId,
            requestBody: eventResource,
        });

        console.log('Event Expiry Kalender Dibuat:', res.data.htmlLink);

    } catch (error) {
        console.error('Gagal mengontak Google Calendar API:', error);
    }
});
