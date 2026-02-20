import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();
// Domain restriction dikontrol melalui env GOOGLE_WORKSPACE_DOMAIN
// Jika variabel di-set, hanya akun dari domain tersebut yang bisa login
const workspaceDomain = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN;
if (workspaceDomain) {
    googleProvider.setCustomParameters({ hd: workspaceDomain });
}

/**
 * Login dengan Google Workspace SSO
 */
export async function signInWithGoogle(): Promise<User> {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Gagal login:', error);
        throw error;
    }
}

/**
 * Logout dan bersihkan session
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Subscribe ke perubahan auth state
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
}

/**
 * Ambil custom claims (role, department) dari token
 */
export async function getUserClaims(): Promise<{
    role: string;
    department: string;
} | null> {
    if (!auth) return null;
    const user = auth.currentUser;
    if (!user) return null;

    const tokenResult = await user.getIdTokenResult();
    return {
        role: (tokenResult.claims.role as string) || 'employee',
        department: (tokenResult.claims.department as string) || '',
    };
}

/**
 * Force refresh token (setelah role di-update oleh admin)
 */
export async function forceRefreshToken(): Promise<string | null> {
    if (!auth) return null;
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken(true);
}
