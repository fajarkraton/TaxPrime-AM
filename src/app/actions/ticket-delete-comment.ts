'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Delete a ticket comment.
 * Allowed if: user is the comment author OR user is IT staff/admin.
 */
export async function deleteTicketComment(
    ticketId: string,
    commentId: string,
    userId: string,
    userName: string,
    userRole: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const commentRef = adminDb
            .collection('serviceTickets')
            .doc(ticketId)
            .collection('comments')
            .doc(commentId);

        const commentSnap = await commentRef.get();
        if (!commentSnap.exists) {
            return { success: false, error: 'Komentar tidak ditemukan.' };
        }

        const comment = commentSnap.data()!;
        const isAuthor = comment.authorId === userId;
        const isPrivileged = ['it_staff', 'admin', 'super_admin'].includes(userRole);

        if (!isAuthor && !isPrivileged) {
            return { success: false, error: 'Anda tidak memiliki izin untuk menghapus komentar ini.' };
        }

        await commentRef.delete();

        // Audit trail
        await adminDb.collection('auditTrails').add({
            entityId: ticketId,
            entityType: 'ticket',
            action: 'comment_deleted',
            actionBy: userId,
            actionByName: userName,
            timestamp: FieldValue.serverTimestamp() as unknown as Timestamp,
            details: `Komentar oleh ${comment.authorName} dihapus.`,
        });

        revalidatePath(`/tickets/${ticketId}`);
        return { success: true };
    } catch (error: unknown) {
        console.error('Delete Comment Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal menghapus komentar.' };
    }
}
