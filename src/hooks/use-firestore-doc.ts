'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface UseDocOptions {
    collectionPath: string;
    docId: string | null;
    realtime?: boolean;
}

interface UseDocResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

export function useFirestoreDoc<T extends { id?: string }>(
    options: UseDocOptions
): UseDocResult<T> {
    const { collectionPath, docId, realtime = false } = options;
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!docId) { setLoading(false); return; }

        const docRef = doc(db, collectionPath, docId);

        if (realtime) {
            setLoading(true);
            const unsubscribe = onSnapshot(docRef,
                (snapshot) => {
                    if (snapshot.exists()) {
                        setData({ id: snapshot.id, ...snapshot.data() } as T);
                    } else {
                        setData(null);
                    }
                    setLoading(false);
                },
                (err) => { setError(err); setLoading(false); }
            );
            return () => unsubscribe();
        } else {
            setLoading(true);
            getDoc(docRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        setData({ id: snapshot.id, ...snapshot.data() } as T);
                    }
                })
                .catch((err) => setError(err))
                .finally(() => setLoading(false));
        }
    }, [collectionPath, docId, realtime]);

    return { data, loading, error };
}
