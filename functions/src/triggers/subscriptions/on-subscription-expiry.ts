import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export const onSubscriptionExpiryCheck = onSchedule('0 8 * * *', async (event) => {
    console.log('Menjalankan pengecekan masa kedaluwarsa langganan harian...');

    const db = admin.firestore();
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalisasi ke awal hari server

    try {
        const subsSnapshot = await db.collection('subscriptions')
            .where('status', 'in', ['active', 'expiring_soon'])
            .where('autoRenew', '==', false) // Asumsi kita hanya alert yang manual renew
            .get();

        if (subsSnapshot.empty) {
            console.log('Tidak ada langganan aktif yang perlu dicek.');
            return;
        }

        const batch = db.batch();
        let updatesCount = 0;

        for (const doc of subsSnapshot.docs) {
            const data = doc.data();
            if (!data.expiryDate) continue;

            const expiryDate = data.expiryDate.toDate();
            expiryDate.setHours(0, 0, 0, 0);

            const timeDiff = expiryDate.getTime() - now.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            let alertLevel = null;
            let updateField = null;

            if (daysDiff === 30 && !data.reminderSentH30) {
                alertLevel = '30 Hari';
                updateField = 'reminderSentH30';
            } else if (daysDiff === 14 && !data.reminderSentH14) {
                alertLevel = '14 Hari';
                updateField = 'reminderSentH14';
            } else if (daysDiff === 7 && !data.reminderSentH7) {
                alertLevel = '7 Hari';
                updateField = 'reminderSentH7';
            } else if (daysDiff === 1 && !data.reminderSentH1) {
                alertLevel = '1 Hari';
                updateField = 'reminderSentH1';
            } else if (daysDiff <= 0 && data.status !== 'expired') {
                batch.update(doc.ref, {
                    status: 'expired',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;
                continue;
            }

            if (alertLevel && updateField) {
                let targetEmail = 'it-support@taxprime.net';
                if (data.createdBy) {
                    try {
                        const userRecord = await admin.auth().getUser(data.createdBy);
                        if (userRecord.email) targetEmail = userRecord.email;
                    } catch (e) {
                        console.error('User pembuat tidak ditemukan:', data.createdBy);
                    }
                }

                const mailRef = db.collection('mail').doc();
                batch.set(mailRef, {
                    to: [targetEmail],
                    message: {
                        subject: `[PERINGATAN] Langganan ${data.name} Kedaluwarsa dalam ${alertLevel}`,
                        html: `
                            <h2>Peringatan Kedaluwarsa Layanan IT</h2>
                            <p>Layanan berikut akan segera berakhir masa kontrak/langganannya:</p>
                            <ul>
                                <li><strong>Nama Layanan:</strong> ${data.name}</li>
                                <li><strong>Vendor:</strong> ${data.provider}</li>
                                <li><strong>Jatuh Tempo:</strong> ${expiryDate.toLocaleDateString('id-ID')}</li>
                                <li><strong>Sisa Waktu:</strong> ${daysDiff} Hari</li>
                            </ul>
                            <p>Mohon segera lakukan koordinasi perpanjangan kontrak jika layanan ini masih dibutuhkan.</p>
                        `
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                batch.update(doc.ref, {
                    [updateField]: true,
                    status: daysDiff <= 30 ? 'expiring_soon' : data.status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                updatesCount++;
                console.log(`Menjadwalkan alert ${alertLevel} untuk ${data.name}`);
            }
        }

        if (updatesCount > 0) {
            await batch.commit();
            console.log(`${updatesCount} dokumen berhasil diperbarui/dikirim alert.`);
        }

    } catch (error) {
        console.error('Gagal menjalankan scheduler expiry check:', error);
    }
});
