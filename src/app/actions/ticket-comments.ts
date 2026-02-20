'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function addTicketComment(
    ticketId: string,
    content: string,
    authorId: string,
    authorName: string,
    isInternal: boolean = false,
    attachmentUrls: string[] = []
): Promise<{ success: boolean; error?: string }> {
    try {
        const commentRef = adminDb.collection('serviceTickets').doc(ticketId).collection('comments').doc();

        await commentRef.set({
            content,
            authorId,
            authorName,
            isInternal,
            attachmentUrls,
            createdAt: FieldValue.serverTimestamp() as unknown as Timestamp,
        });

        revalidatePath(`/tickets/${ticketId}`);
        return { success: true };
    } catch (error: unknown) {
        console.error('Error adding ticket comment:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal menambahkan komentar' };
    }
}
