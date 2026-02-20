import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

export const onAssetAssignment = onDocumentUpdated('assets/{assetId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();

    // Periksa apakah ada perubahan pada currentUserId (Aset dipinjamkan/dialokasikan)
    if (before.currentUserId !== after.currentUserId && after.currentUserId) {
        try {
            // Dapatkan informasi pengguna untuk mendapatkan email
            const userRecord = await admin.auth().getUser(after.currentUserId);

            if (userRecord.email) {
                // Tulis ke koleksi 'mail' untuk Firebase Extension: Trigger Email
                await admin.firestore().collection('mail').add({
                    to: [userRecord.email],
                    message: {
                        subject: `[ITAMS] Perangkat Baru Dialokasikan: ${after.name}`,
                        html: `
                            <h2>Alokasi Perangkat Baru</h2>
                            <p>Halo ${userRecord.displayName || 'Pengguna'},</p>
                            <p>Tim IT telah mengalokasikan perangkat berikut kepada Anda:</p>
                            <ul>
                                <li><strong>Nama Aset:</strong> ${after.name}</li>
                                <li><strong>Kode Aset:</strong> ${after.kodeAset || '-'}</li>
                                <li><strong>Kategori:</strong> ${after.category}</li>
                            </ul>
                            <p>Silakan periksa perangkat keras yang Anda terima. Jika ada kendala, hubungi Tim IT melalui portal ITAMS.</p>
                            <hr />
                            <p><small>Pesan ini dihasilkan secara otomatis oleh Sistem ITAMS.</small></p>
                        `
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Email alokasi dikirim ke ${userRecord.email} untuk aset ${after.kodeAset}`);
            }
        } catch (error) {
            console.error('Gagal memproses email alokasi aset:', error);
        }
    }
});
