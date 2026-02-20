import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

const ALLOWED_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN || 'taxprime.net';

/**
 * G-USR-13: Server-side domain verification
 * 
 * Called after login to verify the user's email domain server-side.
 * If the domain doesn't match, revoke tokens and return error.
 */
export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const email = decodedToken.email || '';
        const domain = email.split('@')[1] || '';

        if (domain !== ALLOWED_DOMAIN) {
            // Revoke tokens — force sign out
            await adminAuth.revokeRefreshTokens(decodedToken.uid);

            return NextResponse.json(
                {
                    error: `Hanya akun @${ALLOWED_DOMAIN} yang diizinkan mengakses TaxPrime AM.`,
                    unauthorized: true,
                },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true, domain });
    } catch (error) {
        console.error('[verify-domain] Error:', error);
        return NextResponse.json(
            { error: 'Gagal memverifikasi domain' },
            { status: 500 }
        );
    }
}
