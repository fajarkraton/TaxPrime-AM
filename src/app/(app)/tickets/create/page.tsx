import { CreateTicketForm } from '@/components/tickets/create-ticket-form';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Buat Tiket Bantuan | TaxPrime AM',
    description: 'Bentuk pengajuan keluhan IT atau minta fasilitas aset',
};

export default function CreateTicketPage() {
    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Helpdesk', href: '/tickets' },
        { title: 'Buat Tiket Baru', isCurrent: true },
    ];

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <BreadcrumbNav items={breadcrumbItems} />
            <div className="mt-4">
                <CreateTicketForm />
            </div>
        </div>
    );
}
