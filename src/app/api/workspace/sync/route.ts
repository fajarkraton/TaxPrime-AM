import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // MOCK ENDPOINT FOR S4-USER-2
    // Real implementation requires Google Service Account with Domain-Wide Delegation
    // and Google Admin SDK to list workspace users
    try {
        await req.json().catch(() => ({}));

        // Simulasi delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return NextResponse.json({
            success: true,
            syncedCount: 5,
            message: "Mock Sync: 5 akun Google Workspace berhasil disinkronisasi ke sistem.",
            nextSyncToken: "mock-token-xyz-123"
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Sync gagal";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
