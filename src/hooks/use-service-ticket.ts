'use client';

import { where, orderBy, QueryConstraint } from 'firebase/firestore';
import { useFirestoreCollection } from './use-firestore-collection';
import { useFirestoreDoc } from './use-firestore-doc';
import { useMemo } from 'react';
import type { ServiceTicket, TicketFilters } from '@/types';

export function useTicketList(filters: TicketFilters = {}) {
    const constraints = useMemo(() => {
        const arr: QueryConstraint[] = [];
        if (filters.status) arr.push(where('status', '==', filters.status));
        if (filters.priority) arr.push(where('priority', '==', filters.priority));
        if (filters.assignedTechId) arr.push(where('assignedTechId', '==', filters.assignedTechId));
        if (filters.requesterId) arr.push(where('requesterId', '==', filters.requesterId));

        // Sort
        arr.push(orderBy('createdAt', 'desc'));
        return arr;
    }, [filters.status, filters.priority, filters.assignedTechId, filters.requesterId]);

    return useFirestoreCollection<ServiceTicket>({
        collectionPath: 'serviceTickets',
        constraints,
        realtime: true,
        pageSize: 20,
    });
}

export function useTicketDetail(ticketId: string | null) {
    return useFirestoreDoc<ServiceTicket>({
        collectionPath: 'serviceTickets',
        docId: ticketId,
        realtime: true,
    });
}
