import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

// Asumsi Business Rules SLA:
// Critical : 1 Jam Response / 4 Jam Resolution
// High     : 2 Jam Response / 12 Jam Resolution
// Medium   : 1 Hari Response / 3 Hari Resolution
// Low      : 2 Hari Response / 7 Hari Resolution

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export const onTicketCreate = onDocumentCreated(
    { document: 'tickets/{ticketId}', region: 'asia-southeast2' },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const ticketData = snap.data();
        if (!ticketData) return null;

        const priority = ticketData.priority as string;
        const now = new Date();

        let responseTarget: Date;
        let resolutionTarget: Date;

        switch (priority) {
            case 'critical':
                responseTarget = addHours(now, 1);
                resolutionTarget = addHours(now, 4);
                break;
            case 'high':
                responseTarget = addHours(now, 2);
                resolutionTarget = addHours(now, 12);
                break;
            case 'medium':
                responseTarget = addDays(now, 1);
                resolutionTarget = addDays(now, 3);
                break;
            case 'low':
                responseTarget = addDays(now, 2);
                resolutionTarget = addDays(now, 7);
                break;
            default:
                responseTarget = addDays(now, 1);
                resolutionTarget = addDays(now, 3);
                break;
        }

        try {
            await snap.ref.update({
                slaResponseTarget: admin.firestore.Timestamp.fromDate(responseTarget),
                slaResolutionTarget: admin.firestore.Timestamp.fromDate(resolutionTarget),
                // Queue email notification
                "queue.emailSent": false
            });

            console.log(`[Ticket ${event.params.ticketId}] SLA calculated successfully. Response: ${responseTarget.toISOString()}, Resolution: ${resolutionTarget.toISOString()}`);

            // Menulis ke koleksi 'mail' agar ditangkap oleh Firebase Extension: Trigger Email
            await admin.firestore().collection('mail').add({
                to: ['it-support@taxprime.net'],
                message: {
                    subject: `[TIKET BARU] ${ticketData.priority.toUpperCase()} - ${ticketData.ticketNumber}`,
                    html: `
                        <h2>Tiket Bantuan Baru Masuk</h2>
                        <p><strong>No Tiket:</strong> ${ticketData.ticketNumber}</p>
                        <p><strong>Pelapor:</strong> ${ticketData.requesterName}</p>
                        <p><strong>Prioritas:</strong> ${ticketData.priority}</p>
                        <p><strong>Judul:</strong> ${ticketData.title}</p>
                        <hr />
                        <p>Buka dashboard ITAMS untuk melihat rincian tiket.</p>
                    `
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error(`[Ticket ${event.params.ticketId}] SLA update failed:`, error);
        }

        return;
    }
);
