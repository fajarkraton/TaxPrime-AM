'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { AssetFormValues } from '@/lib/validations/asset';
import { sendEmail } from '@/lib/google/gmail';
import { assetAssignedEmail, assetReturnedEmail } from '@/lib/google/email-templates';
import { createHandoverDocument } from './document';

export async function createAsset(data: AssetFormValues, authorId: string, authorName: string) {
    try {
        // Determine the counter to use
        let counterId = 'asset_general_2026';
        let prefix = 'TPR-GEN-2026';

        if (data.category === 'laptop') {
            counterId = 'asset_laptop_2026';
            prefix = 'TPR-LPT-2026';
        } else if (data.category === 'computer') {
            counterId = 'asset_desktop_2026';
            prefix = 'TPR-DSK-2026';
        } else if (data.category === 'monitor') {
            counterId = 'asset_monitor_2026';
            prefix = 'TPR-MON-2026';
        } else if (data.category === 'printer') {
            counterId = 'asset_printer_2026';
            prefix = 'TPR-PRT-2026';
        } else if (data.category === 'software') {
            counterId = 'asset_software_2026';
            prefix = 'TPR-SFT-2026';
        }

        // S3-ASSET-3: Auto-generate kode aset
        // We import generateKodeBerikutnya from the functions utilities directly via admin SDK
        const counterRef = adminDb.collection('counters').doc(counterId);
        const assetCode = await adminDb.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const currentValue = counterDoc.exists ? counterDoc.data()!.currentValue : 0;
            const nextValue = currentValue + 1;

            transaction.set(counterRef, {
                currentValue: nextValue,
                prefix,
                updatedAt: FieldValue.serverTimestamp(),
            });

            return `${prefix}-${String(nextValue).padStart(3, '0')}`;
        });

        const newAssetRef = adminDb.collection('assets').doc();
        const assetId = newAssetRef.id;

        // Remove hardwareSpecs from the main document to store in subcollection
        const { hardwareSpecs, ...mainAssetData } = data;

        const assetDoc = {
            ...mainAssetData,
            id: assetId,
            assetCode,
            photoUrls: [],
            qrCodeUrl: '', // Will be updated later or generated on frontend
            assignedTo: null,
            assignedToName: '',
            assignedToDepartment: '',
            assignedAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            authorId,
            authorName,
        };

        const batch = adminDb.batch();

        // 1. Create Main Asset Document
        batch.set(newAssetRef, assetDoc);

        // 2. Create Hardware Specs Subcollection (if applicable)
        if (hardwareSpecs && (data.category === 'laptop' || data.category === 'computer')) {
            const specsRef = newAssetRef.collection('hardwareSpecs').doc('specs');
            batch.set(specsRef, {
                ...hardwareSpecs,
                updatedAt: FieldValue.serverTimestamp()
            });
        }

        await batch.commit();

        return { success: true, assetId, assetCode };

    } catch (error) {
        console.error('Failed to create asset:', error);
        return { success: false, error: 'Gagal membuat aset baru' };
    }
}

// S4-ASSIGN-1: Asset Assignment Flow
export async function assignAsset(
    assetId: string,
    userId: string,
    userName: string,
    userDepartment: string,
    actionBy: string,
    actionByName: string,
    notes?: string
) {
    try {
        const assetRef = adminDb.collection('assets').doc(assetId);

        await adminDb.runTransaction(async (transaction) => {
            const assetDoc = await transaction.get(assetRef);
            if (!assetDoc.exists) throw new Error("Aset tidak ditemukan");

            const assetData = assetDoc.data();
            if (assetData?.status !== 'in_stock') throw new Error("Aset tidak berstatus In Stock");

            // 1. Update Aset
            transaction.update(assetRef, {
                status: 'deployed',
                assignedTo: userId,
                assignedToName: userName,
                assignedToDepartment: userDepartment,
                assignedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // 2. Tulis Audit Trail
            const auditRef = adminDb.collection('auditTrails').doc();
            transaction.set(auditRef, {
                entityId: assetId,
                entityType: 'asset',
                action: 'assigned',
                actionBy,
                actionByName,
                timestamp: FieldValue.serverTimestamp(),
                details: `Aset dipinjamkan / didaftarkan penggunaannya ke ${userName} (${userDepartment}).${notes ? ' Catatan: ' + notes : ''}`,
                changes: {
                    status: { old: assetData?.status, new: 'deployed' },
                    assignedTo: { old: assetData?.assignedTo, new: userId }
                }
            });

            // G-USR-11: Track assigned assets in user doc
            const userRef = adminDb.collection('users').doc(userId);
            transaction.set(userRef, {
                assignedAssets: FieldValue.arrayUnion(assetId),
                assignedAssetsCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        });

        // G-USR-04: Send email notification to assigned user
        try {
            const userDoc = await adminDb.collection('users').doc(userId).get();
            const assetDoc = await adminDb.collection('assets').doc(assetId).get();
            const userEmail = userDoc.data()?.email;
            const asset = assetDoc.data();
            if (userEmail && asset) {
                const { subject, html } = assetAssignedEmail({
                    userName,
                    assetCode: asset.assetCode || '',
                    assetName: asset.name || '',
                    category: asset.category || '',
                    brand: asset.brand || '',
                    model: asset.model || '',
                    department: userDepartment,
                });
                await sendEmail(userEmail, subject, html);
            }
        } catch (emailErr) {
            console.warn('[assignAsset] Email notification failed (non-blocking):', emailErr);
        }

        // Auto-create Berita Acara Serah Terima
        try {
            await createHandoverDocument(assetId, userId, 'handover', actionBy, actionByName, notes);
        } catch (docErr) {
            console.warn('[assignAsset] Auto-create document failed (non-blocking):', docErr);
        }

        return { success: true };
    } catch (error: unknown) {
        console.error('Assign Asset Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal mengubah status aset' };
    }
}

// S4-ASSIGN-2: Asset Return Flow
export async function returnAsset(
    assetId: string,
    condition: 'excellent' | 'good' | 'fair' | 'poor',
    actionBy: string,
    actionByName: string,
    notes?: string
) {
    try {
        const assetRef = adminDb.collection('assets').doc(assetId);

        // Capture previous user info before transaction clears it
        const assetSnap = await assetRef.get();
        const prevUserId = assetSnap.data()?.assignedTo;
        const prevUserName = assetSnap.data()?.assignedToName;
        const prevAssetCode = assetSnap.data()?.assetCode;
        const prevAssetName = assetSnap.data()?.name;

        await adminDb.runTransaction(async (transaction) => {
            const assetDoc = await transaction.get(assetRef);
            if (!assetDoc.exists) throw new Error("Aset tidak ditemukan");

            const assetData = assetDoc.data();
            if (assetData?.status !== 'deployed') throw new Error("Aset sedang tidak digunakan");

            const oldUser = assetData?.assignedToName;

            transaction.update(assetRef, {
                status: 'in_stock',
                condition,
                assignedTo: null,
                assignedToName: '',
                assignedToDepartment: '',
                assignedAt: null,
                updatedAt: FieldValue.serverTimestamp(),
            });

            const auditRef = adminDb.collection('auditTrails').doc();
            transaction.set(auditRef, {
                entityId: assetId,
                entityType: 'asset',
                action: 'returned',
                actionBy,
                actionByName,
                timestamp: FieldValue.serverTimestamp(),
                details: `Aset dikembalikan oleh ${oldUser} ke gudang dengan kondisi ${condition}.${notes ? ' Catatan: ' + notes : ''}`,
                changes: {
                    status: { old: assetData?.status, new: 'in_stock' },
                    condition: { old: assetData?.condition, new: condition },
                    assignedTo: { old: assetData?.assignedTo, new: null }
                }
            });

            // G-USR-11: Remove asset from previous user's assigned list
            if (assetData?.assignedTo) {
                const prevUserRef = adminDb.collection('users').doc(assetData.assignedTo);
                transaction.set(prevUserRef, {
                    assignedAssets: FieldValue.arrayRemove(assetId),
                    assignedAssetsCount: FieldValue.increment(-1),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        });

        // G-USR-05: Send email notification to previous user
        if (prevUserId) {
            try {
                const userDoc = await adminDb.collection('users').doc(prevUserId).get();
                const userEmail = userDoc.data()?.email;
                if (userEmail) {
                    const { subject, html } = assetReturnedEmail({
                        userName: prevUserName || 'Pengguna',
                        assetCode: prevAssetCode || '',
                        assetName: prevAssetName || '',
                    });
                    await sendEmail(userEmail, subject, html);
                }
            } catch (emailErr) {
                console.warn('[returnAsset] Email notification failed (non-blocking):', emailErr);
            }
        }

        // Auto-create Berita Acara Pengembalian
        if (prevUserId) {
            try {
                await createHandoverDocument(assetId, prevUserId, 'return', actionBy, actionByName, notes);
            } catch (docErr) {
                console.warn('[returnAsset] Auto-create document failed (non-blocking):', docErr);
            }
        }

        return { success: true };
    } catch (error: unknown) {
        console.error('Return Asset Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal mengembalikan aset' };
    }
}

// S4-ASSIGN-3: Asset Retire / Dispose Flow
export async function retireAsset(
    assetId: string,
    reason: string,
    actionBy: string,
    actionByName: string
) {
    try {
        const assetRef = adminDb.collection('assets').doc(assetId);

        await adminDb.runTransaction(async (transaction) => {
            const assetDoc = await transaction.get(assetRef);
            if (!assetDoc.exists) throw new Error("Aset tidak ditemukan");

            const assetData = assetDoc.data();

            // G-USR-06: Must return first before retiring
            if (assetData?.status === 'deployed') {
                throw new Error('Aset masih ditugaskan ke karyawan. Kembalikan terlebih dahulu sebelum memensiunkan.');
            }

            transaction.update(assetRef, {
                status: 'retired',
                assignedTo: null,
                assignedToName: '',
                assignedToDepartment: '',
                updatedAt: FieldValue.serverTimestamp(),
            });

            const auditRef = adminDb.collection('auditTrails').doc();
            transaction.set(auditRef, {
                entityId: assetId,
                entityType: 'asset',
                action: 'retired',
                actionBy,
                actionByName,
                timestamp: FieldValue.serverTimestamp(),
                details: `Aset dipensiunkan dengan alasan: ${reason}`,
                changes: {
                    status: { old: assetData?.status, new: 'retired' },
                }
            });
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Retire Asset Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal memensiunkan aset' };
    }
}

// S4-ASSET-EDIT: Update Asset Fields
export async function updateAsset(
    assetId: string,
    updates: Partial<AssetFormValues>,
    actionBy: string,
    actionByName: string
) {
    try {
        const assetRef = adminDb.collection('assets').doc(assetId);
        const { hardwareSpecs, ...mainUpdates } = updates;

        await adminDb.runTransaction(async (transaction) => {
            const assetDoc = await transaction.get(assetRef);
            if (!assetDoc.exists) throw new Error("Aset tidak ditemukan");

            // 1. Update Dokumen Utama
            transaction.update(assetRef, {
                ...mainUpdates,
                updatedAt: FieldValue.serverTimestamp(),
            });

            // 2. Update Subcollection jika category adalah computer/laptop dan hardwareSpecs disediakan
            const existingData = assetDoc.data();
            const finalCategory = mainUpdates.category || existingData?.category;

            if (hardwareSpecs && (finalCategory === 'laptop' || finalCategory === 'computer')) {
                const specsRef = assetRef.collection('hardwareSpecs').doc('specs');
                transaction.set(specsRef, {
                    ...hardwareSpecs,
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 3. Catat Audit Log
            const auditRef = adminDb.collection('auditTrails').doc();
            transaction.set(auditRef, {
                entityId: assetId,
                entityType: 'asset',
                action: 'updated',
                actionBy,
                actionByName,
                timestamp: FieldValue.serverTimestamp(),
                details: `Informasi aset diperbarui.`,
            });
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Update Asset Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui aset' };
    }
}

// S9: Bulk Import — Enhanced with duplicate detection & per-row error reporting
export async function bulkImportAssets(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    csvRows: any[],
    authorId: string,
    authorName: string
) {
    if (!csvRows || csvRows.length === 0) {
        return { success: false, error: 'File CSV kosong atau tidak valid.' };
    }

    try {
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: [] as string[],
            rowErrors: [] as { row: number; field: string; message: string }[],
        };

        // ── Step 1: Collect serial numbers from CSV for duplicate detection ──
        const csvSerials = new Map<string, number>(); // serial → first row number
        for (let i = 0; i < csvRows.length; i++) {
            const sn = csvRows[i]['Nomor Seri']?.trim();
            if (sn) {
                if (csvSerials.has(sn)) {
                    results.rowErrors.push({
                        row: i + 2, // +2 because header=row1, data starts row2
                        field: 'Nomor Seri',
                        message: `Duplikat dalam file CSV — sama dengan baris ${csvSerials.get(sn)!}`,
                    });
                    results.failedCount++;
                } else {
                    csvSerials.set(sn, i + 2);
                }
            }
        }

        // ── Step 2: Check existing serial numbers in Firestore ──
        const uniqueSerials = Array.from(csvSerials.keys());
        const existingSerials = new Set<string>();
        if (uniqueSerials.length > 0) {
            // Firestore 'in' queries support max 30 items per call
            for (let i = 0; i < uniqueSerials.length; i += 30) {
                const batch30 = uniqueSerials.slice(i, i + 30);
                const snap = await adminDb.collection('assets')
                    .where('serialNumber', 'in', batch30)
                    .select('serialNumber')
                    .get();
                snap.docs.forEach(d => existingSerials.add(d.data().serialNumber));
            }
        }

        // ── Step 3: Per-row validation & batch write ──
        const CHUNK_SIZE = 450;
        const validRows: { index: number; data: Record<string, unknown> }[] = [];

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNum = i + 2;

            // Check if already flagged as CSV duplicate
            const sn = row['Nomor Seri']?.trim() || '';
            if (sn && results.rowErrors.some(e => e.row === rowNum && e.field === 'Nomor Seri')) {
                continue; // Already marked as duplicate
            }

            // Required field: Nama
            const name = row['Nama']?.trim();
            if (!name) {
                results.rowErrors.push({ row: rowNum, field: 'Nama', message: 'Field "Nama" wajib diisi' });
                results.failedCount++;
                continue;
            }

            // Check serial against existing Firestore data
            if (sn && existingSerials.has(sn)) {
                results.rowErrors.push({ row: rowNum, field: 'Nomor Seri', message: `"${sn}" sudah terdaftar di database` });
                results.failedCount++;
                continue;
            }

            // Validate price is numeric
            const priceStr = row['Harga Beli']?.trim() || '0';
            const price = parseFloat(priceStr);
            if (priceStr !== '0' && isNaN(price)) {
                results.rowErrors.push({ row: rowNum, field: 'Harga Beli', message: `"${priceStr}" bukan angka valid` });
                results.failedCount++;
                continue;
            }

            // Validate status enum
            const status = row['Status']?.trim()?.toLowerCase() || 'in_stock';
            const validStatuses = ['in_stock', 'deployed', 'maintenance', 'retired', 'disposed'];
            if (!validStatuses.includes(status)) {
                results.rowErrors.push({ row: rowNum, field: 'Status', message: `"${row['Status']?.trim()}" bukan status valid (${validStatuses.join('/')})` });
                results.failedCount++;
                continue;
            }

            // Validate condition enum
            const condition = row['Kondisi']?.trim()?.toLowerCase() || 'good';
            const validConditions = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'];
            if (!validConditions.includes(condition)) {
                results.rowErrors.push({ row: rowNum, field: 'Kondisi', message: `"${row['Kondisi']?.trim()}" bukan kondisi valid (${validConditions.join('/')})` });
                results.failedCount++;
                continue;
            }

            const category = row['Kategori']?.trim()?.toLowerCase() || 'other';
            const type = row['Tipe']?.trim()?.toLowerCase() || 'other';
            const assetCode = `TPR-IMP-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}-${String(i).padStart(3, '0')}`;

            validRows.push({
                index: i,
                data: {
                    assetCode,
                    name,
                    category,
                    type,
                    brand: row['Merek']?.trim() || '',
                    model: row['Model']?.trim() || '',
                    serialNumber: sn,
                    status,
                    condition,
                    department: row['Departemen']?.trim() || 'IT',
                    location: row['Lokasi']?.trim() || '',
                    purchasePrice: price,
                    vendor: row['Vendor']?.trim() || '',
                    photoUrls: [],
                    qrCodeUrl: '',
                    assignedTo: null,
                    assignedToName: '',
                    assignedToDepartment: '',
                    assignedAt: null,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    authorId,
                    authorName,
                },
            });
        }

        // Batch write valid rows
        for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            const chunk = validRows.slice(i, i + CHUNK_SIZE);
            const batch = adminDb.batch();

            for (const { data } of chunk) {
                const newRef = adminDb.collection('assets').doc();
                batch.set(newRef, { id: newRef.id, ...data });
                results.successCount++;
            }

            await batch.commit();
        }

        // Write Audit Trail for the entire batch operation
        if (results.successCount > 0) {
            const auditRef = adminDb.collection('auditTrails').doc();
            await auditRef.set({
                entityId: 'SYSTEM',
                entityType: 'system',
                action: 'bulk_import',
                actionBy: authorId,
                actionByName: authorName,
                timestamp: FieldValue.serverTimestamp(),
                details: `Bulk import aset: ${results.successCount} berhasil, ${results.failedCount} gagal dari ${csvRows.length} baris.`,
            });
        }

        return { success: true, data: results };

    } catch (error) {
        console.error('Bulk Import Failed:', error);
        return { success: false, error: 'Terjadi kesalahan sistem saat melakukan Bulk Import.' };
    }
}
