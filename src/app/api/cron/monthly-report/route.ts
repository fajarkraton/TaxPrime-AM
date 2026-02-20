import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb as db } from '@/lib/firebase/admin';
import { getSheetsClient } from '@/lib/google/auth';
import { sendEmail } from '@/lib/google/gmail';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * GET /api/cron/monthly-report
 * 
 * Automated monthly report generation to Google Sheets.
 * Generates 3 sheets: Asset Summary, Subscription Cost, Asset Assignment.
 * Sends email notification to admin users.
 * Protected by CRON_SECRET.
 */

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { sheets, drive } = getSheetsClient();

        const now = new Date();
        const reportMonth = format(now, 'MMMM yyyy', { locale: localeId });
        const title = `Laporan Bulanan TaxPrime AM — ${reportMonth}`;

        // --- Create Spreadsheet ---
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title },
                sheets: [
                    { properties: { title: 'Ringkasan Aset', sheetId: 0 } },
                    { properties: { title: 'Biaya Langganan', sheetId: 1 } },
                    { properties: { title: 'Alokasi Aset', sheetId: 2 } },
                ],
            },
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId!;
        const spreadsheetUrl = spreadsheet.data.spreadsheetUrl!;

        // --- Sheet 1: Asset Summary ---
        const assetsSnap = await db.collection('assets').get();
        const assetRows: string[][] = [
            ['Kode Aset', 'Nama', 'Kategori', 'Status', 'Departemen', 'Kondisi', 'Harga Beli', 'Tgl Beli'],
        ];
        assetsSnap.docs.forEach(doc => {
            const d = doc.data();
            const purchaseDate = d.purchaseDate?.toDate
                ? format(d.purchaseDate.toDate(), 'dd/MM/yyyy')
                : '-';
            assetRows.push([
                d.assetCode || '', d.name || '', d.category || '', d.status || '',
                d.department || '', d.condition || '', String(d.purchasePrice || 0), purchaseDate,
            ]);
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Ringkasan Aset!A1',
            valueInputOption: 'RAW',
            requestBody: { values: assetRows },
        });

        // --- Sheet 2: Subscription Cost ---
        const subsSnap = await db.collection('subscriptions').get();
        const subRows: string[][] = [
            ['Langganan', 'Provider', 'Status', 'Biaya', 'Siklus', 'Biaya/Bulan', 'Lisensi Terpakai', 'Total Lisensi', 'Jatuh Tempo'],
        ];
        let totalMonthlyCost = 0;
        subsSnap.docs.forEach(doc => {
            const d = doc.data();
            const cost = d.costPerPeriod || 0;
            let monthly = cost;
            if (d.billingCycle === 'annually') monthly = cost / 12;
            else if (d.billingCycle === 'quarterly') monthly = cost / 3;
            if (d.status === 'active' || d.status === 'expiring_soon') totalMonthlyCost += monthly;
            const expiry = d.expiryDate?.toDate
                ? format(d.expiryDate.toDate(), 'dd/MM/yyyy')
                : '-';
            subRows.push([
                d.name || '', d.provider || '', d.status || '',
                String(cost), d.billingCycle || '', String(Math.round(monthly)),
                String(d.usedLicenses || 0), String(d.totalLicenses || 0), expiry,
            ]);
        });
        subRows.push([]); // blank row
        subRows.push(['', '', '', '', 'TOTAL BULANAN:', String(Math.round(totalMonthlyCost))]);

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Biaya Langganan!A1',
            valueInputOption: 'RAW',
            requestBody: { values: subRows },
        });

        // --- Sheet 3: Asset Assignment ---
        const assignRows: string[][] = [
            ['Kode Aset', 'Nama Aset', 'Pengguna', 'Departemen', 'Status'],
        ];
        assetsSnap.docs.forEach(doc => {
            const d = doc.data();
            if (d.assignedToName) {
                assignRows.push([
                    d.assetCode || '', d.name || '', d.assignedToName || '',
                    d.assignedToDepartment || d.department || '', d.status || '',
                ]);
            }
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Alokasi Aset!A1',
            valueInputOption: 'RAW',
            requestBody: { values: assignRows },
        });

        // --- Format header rows (bold + freeze) ---
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [0, 1, 2].map(sheetId => ({
                    repeatCell: {
                        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                        cell: {
                            userEnteredFormat: {
                                textFormat: { bold: true },
                                backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
                            },
                        },
                        fields: 'userEnteredFormat(textFormat,backgroundColor)',
                    },
                })),
            },
        });

        // Move to shared Drive folder (if configured)
        const folderId = process.env.GOOGLE_SHARED_DRIVE_FOLDER;
        if (folderId) {
            await drive.files.update({
                fileId: spreadsheetId,
                addParents: folderId,
                removeParents: 'root',
                fields: 'id, parents',
            });
        }

        // --- Send email to admins ---
        const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
        let emailsSent = 0;

        for (const adminDoc of adminsSnap.docs) {
            const admin = adminDoc.data();
            if (admin.email) {
                const subject = `📊 ${title} Tersedia`;
                const html = `
                    <div style="font-family: Inter, sans-serif; padding: 24px; max-width: 600px;">
                        <h2 style="color: #1e293b;">Laporan Bulanan TaxPrime AM</h2>
                        <p style="color: #475569;">Halo ${admin.displayName || 'Admin'},</p>
                        <p style="color: #475569;">
                            Laporan bulanan bulan <strong>${reportMonth}</strong> sudah tersedia di Google Sheets.
                        </p>
                        <div style="margin: 24px 0;">
                            <a href="${spreadsheetUrl}" 
                               style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                Buka Laporan
                            </a>
                        </div>
                        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px;">
                            <p style="color: #64748b; font-size: 14px; margin: 0;">Laporan ini berisi:</p>
                            <ul style="color: #64748b; font-size: 14px;">
                                <li>Ringkasan Aset (${assetsSnap.size} aset)</li>
                                <li>Biaya Langganan (${subsSnap.size} langganan, est. Rp ${Math.round(totalMonthlyCost).toLocaleString('id-ID')}/bulan)</li>
                                <li>Alokasi Aset (${assignRows.length - 1} aset dialokasikan)</li>
                            </ul>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                            Email ini dikirim otomatis oleh TaxPrime AM.
                        </p>
                    </div>
                `;
                try {
                    await sendEmail(admin.email, subject, html);
                    emailsSent++;
                } catch {
                    console.error(`Failed to send monthly report email to ${admin.email}`);
                }
            }
        }

        // Audit trail
        await db.collection('auditTrail').add({
            action: 'monthly_report_generated',
            details: `Laporan bulanan ${reportMonth} di-generate ke Google Sheets`,
            spreadsheetId,
            spreadsheetUrl,
            sheetsCount: 3,
            assetsCount: assetsSnap.size,
            subsCount: subsSnap.size,
            emailsSent,
            createdAt: FieldValue.serverTimestamp(),
            performedBy: 'system_cron',
        });

        return NextResponse.json({
            success: true,
            spreadsheetId,
            spreadsheetUrl,
            emailsSent,
            sheets: ['Ringkasan Aset', 'Biaya Langganan', 'Alokasi Aset'],
        });

    } catch (error) {
        console.error('[CRON] Monthly report error:', error);
        return NextResponse.json(
            { error: 'Failed to generate monthly report', details: String(error) },
            { status: 500 }
        );
    }
}
