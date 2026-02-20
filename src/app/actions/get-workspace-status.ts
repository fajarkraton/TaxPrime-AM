'use server';

/**
 * G-SET-03: Return Google Workspace integration status (safe, no secrets)
 */
export async function getWorkspaceStatus(): Promise<{
    configured: boolean;
    serviceAccountEmail: string;
    delegatedUser: string;
    workspaceDomain: string;
}> {
    // Try explicit env var first, then extract from service account key JSON
    let serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const delegatedUser = process.env.GOOGLE_DELEGATED_USER || process.env.GOOGLE_ADMIN_EMAIL || '';
    const workspaceDomain = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN || process.env.GOOGLE_WORKSPACE_DOMAIN || '';
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
    const hasKey = !!keyRaw;

    // Extract client_email from service account key if not set explicitly
    if (!serviceAccountEmail && keyRaw) {
        try {
            const parsed = JSON.parse(keyRaw);
            serviceAccountEmail = parsed.client_email || '';
        } catch {
            // ignore parse errors
        }
    }

    return {
        configured: !!(serviceAccountEmail && hasKey),
        serviceAccountEmail: serviceAccountEmail || 'Tidak dikonfigurasi',
        delegatedUser: delegatedUser || 'Tidak dikonfigurasi',
        workspaceDomain: workspaceDomain || 'Tidak dikonfigurasi',
    };
}
