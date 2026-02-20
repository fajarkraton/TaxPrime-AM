'use client';

import { where, orderBy, QueryConstraint } from 'firebase/firestore';
import { useFirestoreCollection } from './use-firestore-collection';
import { useMemo } from 'react';
import type { Subscription, SubscriptionStatus } from '@/types';

export function useSubscriptionList(status?: SubscriptionStatus) {
    const constraints = useMemo(() => {
        const arr: QueryConstraint[] = [];
        if (status) arr.push(where('status', '==', status));
        arr.push(orderBy('expiryDate', 'asc'));
        return arr;
    }, [status]);

    return useFirestoreCollection<Subscription>({
        collectionPath: 'subscriptions',
        constraints,
        pageSize: 20,
    });
}
