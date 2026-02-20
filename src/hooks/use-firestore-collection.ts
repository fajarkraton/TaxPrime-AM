'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection, query, limit, where,
    startAfter, getDocs, onSnapshot,
    type Query, type DocumentData, type QueryConstraint, type DocumentSnapshot, type WhereFilterOp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface FilterConstraint {
    field: string;
    operator: WhereFilterOp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
}

interface UseCollectionOptions {
    collectionPath: string;
    constraints?: QueryConstraint[];
    filters?: FilterConstraint[];
    realtime?: boolean;
    pageSize?: number;
    enabled?: boolean;
}

interface UseCollectionResult<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useFirestoreCollection<T extends { id: string }>(
    options: UseCollectionOptions
): UseCollectionResult<T> {
    const {
        collectionPath, constraints = [], filters = [], realtime = false,
        pageSize = 20, enabled = true,
    } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const buildQuery = useCallback(
        (afterDoc?: DocumentSnapshot): Query<DocumentData> => {
            const ref = collection(db, collectionPath);
            const queryConstraints = [...constraints];

            // Add dynamic filters
            filters.forEach(f => {
                queryConstraints.push(where(f.field, f.operator, f.value));
            });

            queryConstraints.push(limit(pageSize));

            if (afterDoc) queryConstraints.push(startAfter(afterDoc));
            return query(ref, ...queryConstraints);
        },
        // We ignore constraints here to prevent infinite loop. The caller should use useMemo for constraints.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [collectionPath, pageSize]
    );

    const fetchData = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            const q = buildQuery();
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
            setData(docs);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [buildQuery, enabled, pageSize]);

    const loadMore = useCallback(async () => {
        if (!lastDoc || !hasMore) return;
        try {
            const q = buildQuery(lastDoc);
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
            setData((prev) => [...prev, ...docs]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err) {
            setError(err as Error);
        }
    }, [buildQuery, lastDoc, hasMore, pageSize]);

    useEffect(() => {
        if (!enabled) return;

        if (realtime) {
            const q = buildQuery();
            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
                    setData(docs);
                    setLoading(false);
                },
                (err) => { setError(err); setLoading(false); }
            );
            return () => unsubscribe();
        } else {
            fetchData();
        }
    }, [enabled, realtime, buildQuery, fetchData]);

    return { data, loading, error, hasMore, loadMore, refresh: fetchData };
}
