import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { TicketDetailClient } from '@/components/tickets/ticket-detail-client';

export const dynamic = 'force-dynamic';

/**
 * Convert Firestore Timestamps → ISO strings for Next.js Server→Client boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTicket(data: Record<string, any>, id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = { id };

    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
            // Firestore Timestamp → ISO string
            result[key] = value.toDate().toISOString();
        } else if (value === null || value === undefined) {
            result[key] = value;
        } else {
            result[key] = value;
        }
    }
    return result;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const ticketDoc = await adminDb.collection('serviceTickets').doc(id).get();
        if (ticketDoc.exists) {
            const data = ticketDoc.data()!;
            return {
                title: `${data.ticketNumber} - ${data.title} | TaxPrime AM`,
                description: `Detail Service Ticket ${data.ticketNumber}`
            };
        }
    } catch (e) {
        console.error(e);
    }

    return { title: 'Ticket Not Found | TaxPrime AM' };
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const ticketDoc = await adminDb.collection('serviceTickets').doc(id).get();
        if (!ticketDoc.exists) {
            notFound();
        }

        const ticket = serializeTicket(ticketDoc.data()!, ticketDoc.id);

        const breadcrumbItems = [
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Helpdesk Tickets', href: '/tickets' },
            { title: ticket.ticketNumber, isCurrent: true },
        ];

        return (
            <div className="flex flex-col gap-6">
                <BreadcrumbNav items={breadcrumbItems} />
                <TicketDetailClient ticket={ticket as never} ticketId={id} />
            </div>
        );
    } catch (error) {
        console.error('Error fetching ticket details:', error);
        return (
            <div className="p-8 text-center text-red-500">
                Gagal memuat detail tiket. Silakan coba lagi.
            </div>
        );
    }
}

