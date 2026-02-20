import { getCalendarClient } from './auth';

/**
 * Create a Google Calendar event for a subscription renewal reminder.
 * Falls back gracefully if credentials are not configured.
 */
export async function createCalendarEvent(data: {
    title: string;
    date: Date;
    description: string;
    attendees?: string[];
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            console.log(`[Calendar] Skipped (no credentials): "${data.title}"`);
            return { success: true };
        }

        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

        const event = await calendar.events.insert({
            calendarId,
            requestBody: {
                summary: data.title,
                description: data.description,
                start: {
                    date: data.date.toISOString().split('T')[0], // All-day event
                    timeZone: 'Asia/Jakarta',
                },
                end: {
                    date: data.date.toISOString().split('T')[0],
                    timeZone: 'Asia/Jakarta',
                },
                attendees: data.attendees?.map(email => ({ email })),
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 7 * 24 * 60 }, // 7 days before
                        { method: 'email', minutes: 1 * 24 * 60 }, // 1 day before
                        { method: 'popup', minutes: 60 },           // 1 hour before
                    ],
                },
                colorId: '11', // Red — tomato color for urgency
            },
        });

        console.log(`[Calendar] Created event: "${data.title}" → ${event.data.id}`);
        return { success: true, eventId: event.data.id || undefined };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Calendar] Failed: "${data.title}":`, message);
        return { success: false, error: message };
    }
}

/**
 * Create renewal reminder event from subscription data
 */
export async function createSubscriptionRenewalEvent(sub: {
    name: string;
    provider: string;
    expiryDate: Date;
    costPerPeriod: number;
    billingCycle: string;
    id: string;
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    return createCalendarEvent({
        title: `🔄 Renewal: ${sub.name} (${sub.provider})`,
        date: sub.expiryDate,
        description: [
            `Langganan "${sub.name}" dari ${sub.provider} akan berakhir.`,
            `Biaya: ${formatCurrency(sub.costPerPeriod)} / ${sub.billingCycle}`,
            ``,
            `Detail: ${appUrl}/subscriptions/${sub.id}`,
        ].join('\n'),
    });
}
