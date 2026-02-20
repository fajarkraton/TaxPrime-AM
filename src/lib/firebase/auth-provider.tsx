'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { onAuthChange, getUserClaims, forceRefreshToken } from './auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import { ensureUserProfile } from '@/app/actions/ensure-user';
import type { UserRole } from '../../types';

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    department: string | null;
    loading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    department: null,
    loading: true,
    isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [department, setDepartment] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const lastClaimsUpdate = useRef<number>(0);

    useEffect(() => {
        let unsubFirestore: (() => void) | null = null;

        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // G-USR-10 + G-USR-12: Ensure profile exists + update lastLoginAt
                const profile = await ensureUserProfile(
                    firebaseUser.uid,
                    firebaseUser.email || '',
                    firebaseUser.displayName || '',
                    firebaseUser.photoURL || ''
                );

                const token = await firebaseUser.getIdToken();
                const claims = await getUserClaims();
                setRole((claims?.role as UserRole) || (profile.role as UserRole) || 'employee');
                setDepartment(claims?.department || profile.department || null);

                // Sync token ke Next.js API untuk set HttpOnly Cookie Session
                await fetch('/api/login', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                // G-USR-09: Listen for claimsUpdatedAt changes (admin changed role/dept)
                if (unsubFirestore) unsubFirestore();
                unsubFirestore = onSnapshot(
                    doc(db, 'users', firebaseUser.uid),
                    async (snap) => {
                        const data = snap.data();
                        if (!data?.claimsUpdatedAt) return;

                        const updateTime = data.claimsUpdatedAt.toMillis?.() || 0;
                        if (updateTime > lastClaimsUpdate.current) {
                            lastClaimsUpdate.current = updateTime;
                            // Force token refresh to pick up new claims
                            await forceRefreshToken();
                            const newClaims = await getUserClaims();
                            if (newClaims) {
                                setRole((newClaims.role as UserRole) || 'employee');
                                setDepartment(newClaims.department || null);
                            }
                        }
                    }
                );
            } else {
                setRole(null);
                setDepartment(null);
                if (unsubFirestore) {
                    unsubFirestore();
                    unsubFirestore = null;
                }

                // Remove Session Cookie
                await fetch('/api/logout', { method: 'GET' });
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (unsubFirestore) unsubFirestore();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                role,
                department,
                loading,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext(): AuthContextType {
    return useContext(AuthContext);
}
