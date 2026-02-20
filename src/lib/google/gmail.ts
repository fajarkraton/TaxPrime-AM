import { getGmailClient } from './auth';

/**
 * Send an email via Gmail API (domain-wide delegation)
 * Falls back gracefully if credentials are not configured.
 */
export async function sendEmail(
    to: string,
    subject: string,
    htmlBody: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Skip if credentials not configured
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            console.log(`[Gmail] Skipped (no credentials): "${subject}" → ${to}`);
            return { success: true };
        }

        const gmail = getGmailClient();
        const fromEmail = process.env.GOOGLE_DELEGATED_USER || 'noreply@taxprime.net';

        const rawMessage = [
            `From: TaxPrime AM <${fromEmail}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            htmlBody,
        ].join('\r\n');

        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log(`[Gmail] Sent: "${subject}" → ${to}`);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Gmail] Failed: "${subject}" → ${to}:`, message);
        return { success: false, error: message };
    }
}
