'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';

/**
 * Assign (or reassign) a service ticket to an IT Staff technician.
 * 
 * If the ticket is still 'open', automatically transitions to 'in_progress'.
 */
export async function assignTicketTech(
    ticketId: string,
    techId: string,
    techName: string,
    actionBy: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ticketRef = adminDb.collection('serviceTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists) {
            return { success: false, error: 'Tiket tidak ditemukan.' };
        }

        const ticket = ticketSnap.data()!;
        const previousTech = ticket.assignedTechName || 'Belum ditugaskan';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
            assignedTechId: techId,
            assignedTechName: techName,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Auto-transition from open → in_progress
        if (ticket.status === 'open') {
            updates.status = 'in_progress';
            updates.respondedAt = FieldValue.serverTimestamp();

            // Check SLA response met
            const slaResponseTarget = ticket.slaResponseTarget;
            if (slaResponseTarget) {
                const targetDate = slaResponseTarget.toDate ? slaResponseTarget.toDate() : new Date(slaResponseTarget);
                updates.slaResponseMet = new Date() <= targetDate;
            }
        }

        await ticketRef.update(updates);

        // Audit trail
        await adminDb.collection('auditTrails').add({
            entityId: ticketId,
            entityType: 'ticket',
            action: 'updated',
            actionBy,
            actionByName,
            timestamp: FieldValue.serverTimestamp() as unknown as Timestamp,
            details: `Tiket ditugaskan ke ${techName}. (Sebelumnya: ${previousTech})`,
            previousValue: { assignedTechName: previousTech },
            newValue: { assignedTechName: techName },
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Assign Ticket Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal menugaskan tiket.' };
    }
}
