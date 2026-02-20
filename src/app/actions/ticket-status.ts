'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/google/gmail';
import { ticketStatusUpdateEmail } from '@/lib/google/email-templates';

/**
 * Allowed status transitions — prevents invalid state changes.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    open: ['in_progress'],
    in_progress: ['waiting_parts', 'resolved'],
    waiting_parts: ['in_progress'],
    resolved: ['closed', 'in_progress'], // reopen or confirm close
    // closed: no transitions allowed
};

/**
 * Update status of a service ticket with full workflow validation.
 * 
 * Business logic:
 * - Validates allowed transitions
 * - On first `in_progress`: sets `respondedAt`, checks `slaResponseMet`
 * - On `resolved`: requires `resolution`, sets `resolvedAt`, checks `slaResolutionMet`
 * - On `closed`: sets `closedAt`
 * - Writes audit trail
 */
export async function updateTicketStatus(
    ticketId: string,
    newStatus: string,
    actionBy: string,
    actionByName: string,
    resolution?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ticketRef = adminDb.collection('serviceTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists) {
            return { success: false, error: 'Tiket tidak ditemukan.' };
        }

        const ticket = ticketSnap.data()!;
        const currentStatus = ticket.status as string;

        // 1. Validate transition
        const allowed = ALLOWED_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(newStatus)) {
            return {
                success: false,
                error: `Transisi status dari "${currentStatus}" ke "${newStatus}" tidak diperbolehkan.`
            };
        }

        // 2. Build update payload
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
            status: newStatus,
            updatedAt: FieldValue.serverTimestamp(),
        };

        const now = new Date();

        // 3. On first response (open → in_progress)
        if (newStatus === 'in_progress' && currentStatus === 'open') {
            updates.respondedAt = FieldValue.serverTimestamp();

            // Calculate SLA response met
            const slaResponseTarget = ticket.slaResponseTarget;
            if (slaResponseTarget) {
                const targetDate = slaResponseTarget.toDate ? slaResponseTarget.toDate() : new Date(slaResponseTarget);
                updates.slaResponseMet = now <= targetDate;
            }
        }

        // 4. On resolved — require resolution text
        if (newStatus === 'resolved') {
            if (!resolution || !resolution.trim()) {
                return { success: false, error: 'Resolusi wajib diisi saat menyelesaikan tiket.' };
            }
            updates.resolution = resolution.trim();
            updates.resolvedAt = FieldValue.serverTimestamp();

            // Calculate SLA resolution met
            const slaResolutionTarget = ticket.slaResolutionTarget;
            if (slaResolutionTarget) {
                const targetDate = slaResolutionTarget.toDate ? slaResolutionTarget.toDate() : new Date(slaResolutionTarget);
                updates.slaResolutionMet = now <= targetDate;
            }
        }

        // 5. On closed
        if (newStatus === 'closed') {
            updates.closedAt = FieldValue.serverTimestamp();
        }

        // 6. On reopen (resolved → in_progress)
        if (newStatus === 'in_progress' && currentStatus === 'resolved') {
            updates.resolvedAt = null;
            updates.closedAt = null;
            updates.slaResolutionMet = null;
            updates.resolution = '';
        }

        // 7. Apply update
        await ticketRef.update(updates);

        // 8. Write audit trail
        await adminDb.collection('auditTrails').add({
            entityId: ticketId,
            entityType: 'ticket',
            action: 'updated',
            actionBy,
            actionByName,
            timestamp: FieldValue.serverTimestamp() as unknown as Timestamp,
            details: `Status tiket diubah dari "${currentStatus}" ke "${newStatus}".${resolution ? ` Resolusi: ${resolution}` : ''}`,
            previousValue: { status: currentStatus },
            newValue: { status: newStatus },
        });

        // 9. Send email notification (fire-and-forget)
        if (ticket.requesterEmail) {
            const { subject, html } = ticketStatusUpdateEmail({
                userName: ticket.requesterName || 'User',
                ticketNumber: ticket.ticketNumber || ticketId,
                title: ticket.title || '',
                oldStatus: currentStatus,
                newStatus,
                ticketId,
            });
            sendEmail(ticket.requesterEmail, subject, html).catch(console.error);
        }

        return { success: true };
    } catch (error: unknown) {
        console.error('Update Ticket Status Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal mengubah status tiket.' };
    }
}

/**
 * Set the rating for a closed ticket (requester only, 1-5 stars).
 */
export async function rateTicket(
    ticketId: string,
    rating: number,
    actionBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (rating < 1 || rating > 5) {
            return { success: false, error: 'Rating harus antara 1 dan 5.' };
        }

        const ticketRef = adminDb.collection('serviceTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) return { success: false, error: 'Tiket tidak ditemukan.' };

        const ticket = ticketSnap.data()!;
        if (ticket.status !== 'closed') {
            return { success: false, error: 'Rating hanya bisa diberikan untuk tiket yang sudah ditutup.' };
        }
        if (ticket.requesterId !== actionBy) {
            return { success: false, error: 'Hanya pelapor yang bisa memberikan rating.' };
        }

        await ticketRef.update({
            rating,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Rate Ticket Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal memberikan rating.' };
    }
}
