'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function allocateLicense(
    subscriptionId: string,
    userId: string,
    userName: string,
    department: string,
    assignedByUid: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const subRef = adminDb.collection('subscriptions').doc(subscriptionId);
        const subSnap = await subRef.get();

        if (!subSnap.exists) {
            return { success: false, error: 'Data langganan tidak ditemukan' };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = subSnap.data() as any;

        // Validasi ketersediaan lisensi
        if (subData.usedLicenses >= subData.totalLicenses) {
            return { success: false, error: 'Kuota lisensi telah penuh (tidak ada sisa).' };
        }

        // Jalankan transaksi (Write Batch lebih aman untuk 2 koleksi)
        const batch = adminDb.batch();

        // 1. Tambah dokumen alokasi di sub-koleksi
        const allocRef = subRef.collection('allocations').doc(userId); // Use userId as doc ID to prevent double assignment easily, or generate a new one
        const allocSnap = await allocRef.get();
        if (allocSnap.exists) {
            return { success: false, error: 'Pengguna sudah dialokasikan ke layanan ini.' };
        }

        batch.set(allocRef, {
            userId,
            userName,
            department,
            assignedAt: FieldValue.serverTimestamp(),
            assignedBy: assignedByUid
        });

        // 2. Inkremen usedLicenses dan update daftar user ID (untuk search/filter admin)
        batch.update(subRef, {
            usedLicenses: FieldValue.increment(1),
            assignedUsers: FieldValue.arrayUnion(userId),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Tambahkan ke Audit Trail
        const auditRef = adminDb.collection('auditTrails').doc();
        batch.set(auditRef, {
            action: 'assigned',
            entityType: 'subscription',
            entityId: subscriptionId,
            description: `Lisensi dialokasikan ke: ${userName} (${department})`,
            timestamp: FieldValue.serverTimestamp(),
            performedBy: assignedByUid
        });

        await batch.commit();

        revalidatePath(`/subscriptions/${subscriptionId}`);
        revalidatePath('/subscriptions');

        return { success: true };
    } catch (error: unknown) {
        console.error('Error allocating license:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal mengalokasikan lisensi.' };
    }
}

export async function revokeLicense(
    subscriptionId: string,
    userId: string,
    userName: string,
    revokedByUid: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const subRef = adminDb.collection('subscriptions').doc(subscriptionId);
        const allocRef = subRef.collection('allocations').doc(userId);

        const batch = adminDb.batch();

        // 1. Hapus dokumen alokasi
        batch.delete(allocRef);

        // 2. Dekremen usedLicenses dan hapus dari array assignedUsers
        batch.update(subRef, {
            usedLicenses: FieldValue.increment(-1),
            assignedUsers: FieldValue.arrayRemove(userId),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Tambahkan ke Audit Trail
        const auditRef = adminDb.collection('auditTrails').doc();
        batch.set(auditRef, {
            action: 'returned',
            entityType: 'subscription',
            entityId: subscriptionId,
            description: `Lisensi dicabut dari: ${userName}`,
            timestamp: FieldValue.serverTimestamp(),
            performedBy: revokedByUid
        });

        await batch.commit();

        revalidatePath(`/subscriptions/${subscriptionId}`);
        revalidatePath('/subscriptions');

        return { success: true };
    } catch (error: unknown) {
        console.error('Error revoking license:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal mencabut lisensi.' };
    }
}
