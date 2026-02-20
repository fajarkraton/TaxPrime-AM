import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Inisialisasi Admin SDK (untuk Server Components dan API Routes)
let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;
let adminStorage: Storage;

function initializeAdmin(): void {
    if (getApps().length > 0) {
        const existingApp = getApps()[0];
        adminApp = existingApp;
        adminDb = getFirestore(existingApp);
        adminAuth = getAuth(existingApp);
        adminStorage = getStorage(existingApp);
        return;
    }

    let credential;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
            // Handle Next.js env string escaping of newlines in the private key
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            credential = cert(serviceAccount);
        } catch (e) {
            console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
        }
    }

    const appConfig: Record<string, unknown> = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    };

    if (credential) {
        appConfig.credential = credential;
    }

    adminApp = initializeApp(appConfig);

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    adminStorage = getStorage(adminApp);
}

// Inisialisasi saat module di-import
initializeAdmin();

export { adminApp, adminDb, adminAuth, adminStorage };
