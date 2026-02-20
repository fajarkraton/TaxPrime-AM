'use client';

import { TicketList } from '@/components/tickets/ticket-list';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function TicketsPage() {
    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Helpdesk Tickets', isCurrent: true },
    ];

    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbNav items={breadcrumbItems} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Helpdesk & Ticketing</h1>
                    <p className="text-muted-foreground mt-1">Kelola dan tangani permintaan bantuan teknis IT.</p>
                </div>
                <Button asChild>
                    <Link href="/tickets/create">
                        <PlusCircle className="w-4 h-4 mr-2" /> Buat Tiket Baru
                    </Link>
                </Button>
            </div>

            <TicketList />
        </div>
    );
}
