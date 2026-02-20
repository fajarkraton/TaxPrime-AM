import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, redirectToHome, redirectToLogin } from 'next-firebase-auth-edge';
import { clientConfig, serverConfig } from '@/lib/firebase/next-auth-edge-config';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
    return authMiddleware(request, {
        loginPath: '/api/login',
        logoutPath: '/api/logout',
        apiKey: clientConfig.apiKey,
        cookieName: 'AuthToken',
        cookieSignatureKeys: ['secret-signature-key-itams-2026'], // TODO: move to env
        cookieSerializeOptions: {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 12 * 60 * 60 * 24, // 12 days
        },
        serviceAccount: serverConfig.serviceAccount,
        handleValidToken: async ({ token, decodedToken }, headers) => {
            // Authenticated user
            if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
                return redirectToHome(request);
            }
            return NextResponse.next({
                request: {
                    headers
                }
            });
        },
        handleInvalidToken: async (reason) => {
            console.info('Penyebab token tidak valid:', reason);
            return redirectToLogin(request, {
                path: '/login',
                publicPaths: PUBLIC_PATHS
            });
        },
        handleError: async (error) => {
            console.error('Unhandled authentication error', { error });
            return redirectToLogin(request, {
                path: '/login',
                publicPaths: PUBLIC_PATHS
            });
        }
    });
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|images).*)',
    ],
};
