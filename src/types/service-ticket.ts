import { type Timestamp } from 'firebase/firestore';
import type { TicketCategory, TicketPriority, TicketStatus } from './enums';

export interface ServiceTicket {
    id: string;
    ticketNumber: string;

    assetRef: string | null;
    assetCode: string;
    assetName: string;

    requesterId: string;
    requesterName: string;
    requesterEmail: string;
    requesterDepartment: string;

    assignedTechId: string | null;
    assignedTechName: string;

    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    title: string;
    description: string;
    resolution: string;

    slaResponseTarget: Timestamp;
    slaResolutionTarget: Timestamp;
    slaResponseMet: boolean | null;
    slaResolutionMet: boolean | null;
    escalated: boolean;
    rating: number | null;

    createdAt: Timestamp;
    respondedAt: Timestamp | null;
    resolvedAt: Timestamp | null;
    closedAt: Timestamp | null;
    updatedAt: Timestamp;
}

export interface CreateTicketInput {
    assetRef?: string;
    category: TicketCategory;
    priority: TicketPriority;
    title: string;
    description: string;
    attachmentUrls?: string[];
}

export interface TicketComment {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    attachmentUrls: string[];
    isInternal: boolean;
    createdAt: Timestamp;
}

export interface TicketFilters {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    assignedTechId?: string;
    requesterId?: string;
    requesterDepartment?: string;
}
