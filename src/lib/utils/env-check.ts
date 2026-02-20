/**
 * Validasi bahwa semua env vars yang diperlukan sudah di-set.
 * Dipanggil saat app startup.
 */
const requiredPublicVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
] as const;

export function validateEnv(): void {
    const missing = requiredPublicVars.filter(
        (key) => !process.env[key]
    );
    if (missing.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`Environment variables tidak ditemukan: ${missing.join(', ')}.`);
        } else {
            throw new Error(
                `Environment variables tidak ditemukan: ${missing.join(', ')}. ` +
                'Pastikan file .env.local sudah dikonfigurasi.'
            );
        }
    }
}
