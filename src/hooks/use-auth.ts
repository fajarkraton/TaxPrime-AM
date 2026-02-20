'use client';

import { useAuthContext } from '../lib/firebase/auth-provider';

/**
 * Hook utama untuk akses info autentikasi user
 */
export function useAuth() {
    const context = useAuthContext();

    return {
        /** Firebase User object */
        user: context.user,
        /** User role dari custom claims */
        role: context.role,
        /** Departemen user */
        department: context.department,
        /** Loading state (saat auth sedang di-resolve) */
        loading: context.loading,
        /** Apakah user sudah login */
        isAuthenticated: context.isAuthenticated,
        /** UID shortcut */
        uid: context.user?.uid || null,
        /** Email shortcut */
        email: context.user?.email || null,
        /** Display name shortcut */
        displayName: context.user?.displayName || null,
    };
}
