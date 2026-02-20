'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

/**
 * Update the priority of a service ticket.
 * Only IT staff/admin can change priority.
 */
export async function updateTicketPriority(
    ticketId: string,
    newPriority: string,
    userId: string,
    userName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!VALID_PRIORITIES.includes(newPriority)) {
            return { success: false, error: 'Prioritas tidak valid.' };
        }

        const ticketRef = adminDb.collection('serviceTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists) {
            return { success: false, error: 'Tiket tidak ditemukan.' };
        }

        const ticket = ticketSnap.data()!;
        const previousPriority = ticket.priority;

        if (previousPriority === newPriority) {
            return { success: true }; // No change needed
        }

        await ticketRef.update({
            priority: newPriority,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Audit trail
        await adminDb.collection('auditTrails').add({
            entityId: ticketId,
            entityType: 'ticket',
            action: 'updated',
            actionBy: userId,
            actionByName: userName,
            timestamp: FieldValue.serverTimestamp() as unknown as Timestamp,
            details: `Prioritas diubah dari "${previousPriority}" ke "${newPriority}".`,
            previousValue: { priority: previousPriority },
            newValue: { priority: newPriority },
        });

        revalidatePath(`/tickets/${ticketId}`);
        return { success: true };
    } catch (error: unknown) {
        console.error('Update Priority Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal mengubah prioritas.' };
    }
}
