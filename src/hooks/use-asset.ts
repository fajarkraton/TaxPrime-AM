'use client';

import { where, orderBy, QueryConstraint } from 'firebase/firestore';
import { useFirestoreCollection } from './use-firestore-collection';
import { useFirestoreDoc } from './use-firestore-doc';
import { useMemo } from 'react';
import type { Asset, AssetFilters } from '@/types';

export function useAssetList(filters: AssetFilters = {}) {
    const constraints = useMemo(() => {
        const arr: QueryConstraint[] = [];
        if (filters.status) arr.push(where('status', '==', filters.status));
        if (filters.category) arr.push(where('category', '==', filters.category));
        if (filters.department) arr.push(where('department', '==', filters.department));
        if (filters.assignedTo) arr.push(where('assignedTo', '==', filters.assignedTo));

        // Sort implementation based on filters
        arr.push(orderBy('updatedAt', 'desc'));

        return arr;
    }, [filters.status, filters.category, filters.department, filters.assignedTo]);

    return useFirestoreCollection<Asset>({
        collectionPath: 'assets',
        constraints,
        pageSize: 20,
    });
}

export function useAssetDetail(assetId: string | null) {
    return useFirestoreDoc<Asset>({
        collectionPath: 'assets',
        docId: assetId,
        realtime: true,
    });
}
