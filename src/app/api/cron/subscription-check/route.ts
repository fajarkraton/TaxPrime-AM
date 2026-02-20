import { NextResponse } from 'next/server';
import { updateSubscriptionStatuses } from '@/app/actions/subscription-status';

/**
 * API route to be called by a cron job (e.g., Vercel Cron, external scheduler).
 * Protected by CRON_SECRET header.
 * 
 * GET /api/cron/subscription-check
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await updateSubscriptionStatuses();

    if (result.success) {
        return NextResponse.json({
            message: 'Subscription statuses updated',
            updated: result.updated,
            expired: result.expired,
            expiringSoon: result.expiringSoon,
            timestamp: new Date().toISOString(),
        });
    } else {
        return NextResponse.json(
            { error: result.error },
            { status: 500 }
        );
    }
}
