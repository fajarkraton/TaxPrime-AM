import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * CRON: Auto-close tickets that have been in 'resolved' status for 3+ days
 * without requester confirmation, per PRD US-TKT-04.
 *
 * GET /api/cron/ticket-autoclose
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // Query resolved tickets older than 3 days
        const resolvedTickets = await adminDb
            .collection('serviceTickets')
            .where('status', '==', 'resolved')
            .where('resolvedAt', '<=', threeDaysAgo)
            .get();

        if (resolvedTickets.empty) {
            return NextResponse.json({
                message: 'Tidak ada tiket yang perlu ditutup otomatis.',
                autoClosedCount: 0,
                timestamp: new Date().toISOString(),
            });
        }

        const closedIds: string[] = [];

        for (const doc of resolvedTickets.docs) {
            const ticketData = doc.data();

            // Update ticket status to closed
            await doc.ref.update({
                status: 'closed',
                closedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // Create audit trail entry
            await adminDb.collection('auditTrails').doc().set({
                entityId: doc.id,
                entityType: 'serviceTicket',
                action: 'auto_closed',
                details: `Tiket ${ticketData.ticketNumber} ditutup otomatis setelah 3 hari tanpa konfirmasi dari pelapor.`,
                actionBy: 'system',
                actionByName: 'TaxPrime AM',
                timestamp: FieldValue.serverTimestamp(),
            });

            closedIds.push(doc.id);
        }

        return NextResponse.json({
            message: `${closedIds.length} tiket ditutup otomatis.`,
            autoClosedCount: closedIds.length,
            ticketIds: closedIds,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Ticket auto-close CRON error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'CRON execution failed' },
            { status: 500 }
        );
    }
}
