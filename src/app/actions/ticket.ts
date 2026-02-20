'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { CreateTicketInput } from '@/types/service-ticket';
import { sendEmail } from '@/lib/google/gmail';
import { ticketCreatedEmail } from '@/lib/google/email-templates';

/**
 * SLA targets per priority level.
 * responseMinutes = max time to first response
 * resolutionMinutes = max time to resolution
 */
const SLA_TARGETS: Record<string, { responseMinutes: number; resolutionMinutes: number }> = {
    critical: { responseMinutes: 30, resolutionMinutes: 240 },     // 30min / 4hr
    high: { responseMinutes: 60, resolutionMinutes: 480 },         // 1hr / 8hr
    medium: { responseMinutes: 240, resolutionMinutes: 1440 },     // 4hr / 24hr
    low: { responseMinutes: 480, resolutionMinutes: 4320 },        // 8hr / 72hr
};

/**
 * Buat Service Ticket Baru
 * Endpoint Server Action ini dipanggil saat Pegawai mensubmit form pengaduan IT
 */
export async function createServiceTicket(
    input: CreateTicketInput,
    reporterUid: string,
    reporterName: string,
    reporterEmail: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        if (!input.title || !input.description || !input.category || !input.priority) {
            throw new Error('Harap lengkapi semua kolom wajib.');
        }

        // 1. Dapatkan Ticket Number terbaru melalui penomoran urut
        const counterRef = adminDb.collection('metadata').doc('ticketCounter');
        let newNumber = 1;

        await adminDb.runTransaction(async (transaction) => {
            const doc = await transaction.get(counterRef);
            if (doc.exists) {
                newNumber = (doc.data()?.count || 0) + 1;
                transaction.update(counterRef, { count: newNumber });
            } else {
                transaction.set(counterRef, { count: newNumber });
            }
        });

        // Format: TKT-2026-0001
        const year = new Date().getFullYear();
        const ticketNumber = `TKT-${year}-${newNumber.toString().padStart(4, '0')}`;

        // 2. Resolve Asset Name if AssetRef was provided
        let assetName = '-';
        let assetCode = '-';

        if (input.assetRef) {
            const assetSnap = await adminDb.collection('assets').doc(input.assetRef).get();
            if (assetSnap.exists) {
                const assetData = assetSnap.data();
                assetName = assetData?.name || '-';
                assetCode = assetData?.assetCode || '-';
            }
        }

        // 2b. Resolve requester department from users collection
        let requesterDepartment = '-';
        try {
            const userSnap = await adminDb.collection('users').doc(reporterUid).get();
            if (userSnap.exists) {
                requesterDepartment = userSnap.data()?.department || '-';
            }
        } catch { /* ignore */ }

        // 3. Calculate SLA targets based on priority
        const now = new Date();
        const slaConfig = SLA_TARGETS[input.priority] || SLA_TARGETS.medium;
        const slaResponseTarget = Timestamp.fromDate(
            new Date(now.getTime() + slaConfig.responseMinutes * 60 * 1000)
        );
        const slaResolutionTarget = Timestamp.fromDate(
            new Date(now.getTime() + slaConfig.resolutionMinutes * 60 * 1000)
        );

        // 4. Simpan dokumen tiket
        const ticketRef = adminDb.collection('serviceTickets').doc();

        const ticketData = {
            ticketNumber,
            title: input.title,
            description: input.description,
            category: input.category,
            priority: input.priority,
            status: 'open',

            assetRef: input.assetRef || null,
            assetName,
            assetCode,

            requesterId: reporterUid,
            requesterName: reporterName,
            requesterEmail: reporterEmail,
            requesterDepartment,

            assignedTechId: null,
            assignedTechName: '',

            resolution: '',

            slaResponseTarget,
            slaResolutionTarget,
            slaResponseMet: null,
            slaResolutionMet: null,
            escalated: false,
            rating: null,
            attachmentUrls: input.attachmentUrls || [],

            createdAt: FieldValue.serverTimestamp() as unknown as Timestamp,
            respondedAt: null,
            resolvedAt: null,
            closedAt: null,
            updatedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
        };

        await ticketRef.set(ticketData);

        // 4. Catat ke Audit Trail
        const auditRef = adminDb.collection('auditTrails').doc();
        await auditRef.set({
            entityId: ticketRef.id,
            entityType: 'ticket',
            action: 'created',
            actionBy: reporterUid,
            actionByName: reporterName,
            timestamp: FieldValue.serverTimestamp(),
            details: `Tiket baru dibuat dengan prioritas ${input.priority}.`,
        });

        // 5. Send email notification (fire-and-forget)
        const slaHours = Math.round(slaConfig.resolutionMinutes / 60);
        const { subject, html } = ticketCreatedEmail({
            userName: reporterName,
            ticketNumber,
            title: input.title,
            category: input.category,
            priority: input.priority,
            slaHours,
        });
        sendEmail(reporterEmail, subject, html).catch(console.error);

        return { success: true, data: ticketRef.id };
    } catch (error: unknown) {
        console.error('Create Ticket Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal membuat tiket bantuan.';
        return { success: false, error: message };
    }
}
