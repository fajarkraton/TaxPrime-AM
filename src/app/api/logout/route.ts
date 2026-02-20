import { NextResponse } from 'next/server';

export async function GET() {
    // `authMiddleware` intercepts `/api/logout` out-of-the-box and handles clearing cookies.
    // This route is just a fallback in case middleware lets it through.
    return NextResponse.json({ status: 'success' });
}
