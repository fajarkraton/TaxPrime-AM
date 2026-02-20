import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/google/gmail';

/**
 * CRON: Auto-escalation for tickets approaching SLA breach.
 * Sends warning email when remaining time < 25% of total SLA window.
 * Per PRD US-TKT-03.
 *
 * GET /api/cron/ticket-escalation
 * Header: Authorization: Bearer <CRON_SECRET>
 */

// SLA windows in minutes (same as ticket.ts)
const SLA_WINDOWS: Record<string, number> = {
    critical: 240,   // 4hr
    high: 480,       // 8hr
    medium: 1440,    // 24hr
    low: 4320,       // 72hr
};

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = Date.now();

        // Query open/in-progress tickets not yet escalated
        const activeTix = await adminDb
            .collection('serviceTickets')
            .where('status', 'in', ['open', 'in_progress', 'waiting_parts'])
            .where('escalated', '==', false)
            .get();

        if (activeTix.empty) {
            return NextResponse.json({
                message: 'Tidak ada tiket yang perlu dieskalasi.',
                escalatedCount: 0,
                timestamp: new Date().toISOString(),
            });
        }

        const escalatedIds: string[] = [];

        for (const doc of activeTix.docs) {
            const data = doc.data();
            const slaTarget = data.slaResolutionTarget;
            if (!slaTarget) continue;

            const targetDate = slaTarget.toDate ? slaTarget.toDate() : new Date(slaTarget);
            const remainingMs = targetDate.getTime() - now;

            // Skip already breached tickets
            if (remainingMs <= 0) continue;

            // Calculate total SLA window for this priority
            const totalWindowMs = (SLA_WINDOWS[data.priority] || SLA_WINDOWS.medium) * 60 * 1000;
            const pctRemaining = remainingMs / totalWindowMs;

            // Escalate if < 25% remaining
            if (pctRemaining < 0.25) {
                // Mark as escalated
                await doc.ref.update({
                    escalated: true,
                    updatedAt: FieldValue.serverTimestamp(),
                });

                // Create audit trail
                await adminDb.collection('auditTrails').doc().set({
                    entityId: doc.id,
                    entityType: 'serviceTicket',
                    action: 'escalated',
                    details: `Tiket ${data.ticketNumber} dieskalasi otomatis — SLA resolution tersisa ${Math.round(remainingMs / 60000)} menit.`,
                    actionBy: 'system',
                    actionByName: 'TaxPrime AM',
                    timestamp: FieldValue.serverTimestamp(),
                });

                // Send escalation email
                try {
                    const remainMins = Math.round(remainingMs / 60000);
                    const subject = `⚠️ ESKALASI SLA: ${data.ticketNumber} - ${data.title}`;
                    const html = `<div style="font-family:sans-serif;max-width:600px">
                        <h2 style="color:#dc2626">⚠️ Peringatan Eskalasi SLA</h2>
                        <p>Tiket <strong>${data.ticketNumber}</strong> mendekati batas SLA.</p>
                        <table style="border-collapse:collapse;width:100%;margin:16px 0">
                            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Judul</td><td style="padding:8px;border:1px solid #e2e8f0">${data.title}</td></tr>
                            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Prioritas</td><td style="padding:8px;border:1px solid #e2e8f0">${data.priority}</td></tr>
                            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Sisa Waktu</td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626;font-weight:600">${remainMins} menit</td></tr>
                            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Pelapor</td><td style="padding:8px;border:1px solid #e2e8f0">${data.requesterName}</td></tr>
                        </table>
                        <p>Segera tindak lanjuti tiket ini untuk menghindari breach SLA.</p>
                    </div>`;
                    await sendEmail(data.requesterEmail, subject, html);
                } catch (emailErr) {
                    console.error(`Failed to send escalation email for ${data.ticketNumber}:`, emailErr);
                }

                escalatedIds.push(doc.id);
            }
        }

        return NextResponse.json({
            message: `${escalatedIds.length} tiket dieskalasi.`,
            escalatedCount: escalatedIds.length,
            ticketIds: escalatedIds,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Ticket escalation CRON error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'CRON execution failed' },
            { status: 500 }
        );
    }
}
