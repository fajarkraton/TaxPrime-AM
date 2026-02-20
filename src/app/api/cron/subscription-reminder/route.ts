import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/google/gmail';
import { subscriptionExpiryEmail } from '@/lib/google/email-templates';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * CRON: Send subscription expiry reminder emails at H-30, H-14, H-7, H-1.
 * Uses existing `subscriptionExpiryEmail` template and `reminderSentH*` flags.
 * Per PRD US-SUB-03.
 *
 * GET /api/cron/subscription-reminder
 * Header: Authorization: Bearer <CRON_SECRET>
 */

// Reminder milestones in days
const MILESTONES = [
    { days: 30, flag: 'reminderSentH30' },
    { days: 14, flag: 'reminderSentH14' },
    { days: 7, flag: 'reminderSentH7' },
    { days: 1, flag: 'reminderSentH1' },
] as const;

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = Date.now();

        // Query non-cancelled, non-expired subscriptions
        const snapshot = await adminDb.collection('subscriptions')
            .where('status', 'in', ['active', 'expiring_soon'])
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                message: 'Tidak ada subscription yang perlu diingatkan.',
                remindersSent: 0,
                timestamp: new Date().toISOString(),
            });
        }

        let totalSent = 0;
        const details: string[] = [];

        // Get admin users for sending reminder to
        const adminsSnap = await adminDb.collection('users')
            .where('role', 'in', ['super_admin', 'admin'])
            .get();
        const adminEmails = adminsSnap.docs
            .map(d => d.data().email as string)
            .filter(Boolean);

        if (adminEmails.length === 0) {
            return NextResponse.json({
                message: 'Tidak ada admin email untuk menerima reminder.',
                remindersSent: 0,
                timestamp: new Date().toISOString(),
            });
        }

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const expiryDate = data.expiryDate?.toDate?.() as Date | undefined;
            if (!expiryDate) continue;

            const daysLeft = Math.ceil((expiryDate.getTime() - now) / (24 * 60 * 60 * 1000));
            if (daysLeft < 0) continue; // Already expired

            // Check each milestone
            for (const milestone of MILESTONES) {
                if (daysLeft <= milestone.days && !data[milestone.flag]) {
                    // Send email to each admin
                    for (const adminEmail of adminEmails) {
                        try {
                            const emailData = subscriptionExpiryEmail({
                                adminName: 'Admin',
                                subscriptionName: data.name,
                                provider: data.provider,
                                expiryDate: format(expiryDate, 'dd MMMM yyyy', { locale: localeId }),
                                daysLeft,
                                costPerPeriod: data.costPerPeriod || 0,
                                billingCycle: data.billingCycle || 'monthly',
                                subscriptionId: doc.id,
                            });
                            await sendEmail(adminEmail, emailData.subject, emailData.html);
                        } catch (emailErr) {
                            console.error(`Failed to send reminder to ${adminEmail} for ${data.name}:`, emailErr);
                        }
                    }

                    // Update flag
                    await doc.ref.update({
                        [milestone.flag]: true,
                        updatedAt: FieldValue.serverTimestamp(),
                    });

                    // Audit trail
                    await adminDb.collection('auditTrails').doc().set({
                        entityId: doc.id,
                        entityType: 'subscription',
                        action: 'reminder_sent',
                        details: `Reminder H-${milestone.days} terkirim untuk ${data.name} (${data.provider}). Sisa ${daysLeft} hari.`,
                        actionBy: 'system',
                        actionByName: 'TaxPrime AM',
                        timestamp: FieldValue.serverTimestamp(),
                    });

                    totalSent++;
                    details.push(`${data.name}: H-${milestone.days} (${daysLeft} hari tersisa)`);

                    // Only send the most urgent milestone that hasn't been sent yet
                    break;
                }
            }
        }

        return NextResponse.json({
            message: `${totalSent} reminder terkirim.`,
            remindersSent: totalSent,
            details,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Subscription reminder CRON error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'CRON execution failed' },
            { status: 500 }
        );
    }
}
