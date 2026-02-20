'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRBAC } from '@/hooks/use-rbac';
import {
    LayoutDashboard,
    MonitorSmartphone,
    Ticket,
    CreditCard,
    FileText,
    Users,
    Settings,
    Package,
    FileSignature,
} from 'lucide-react';

export function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
    const pathname = usePathname();
    const { can, isSuperAdmin } = useRBAC();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
        { name: 'Aset Saya', href: '/my-assets', icon: Package, show: true },
        { name: 'Dokumen Saya', href: '/my-documents', icon: FileSignature, show: true },
        { name: 'Assets', href: '/assets', icon: MonitorSmartphone, show: can('asset:view_own') },
        { name: 'Service Tickets', href: '/tickets', icon: Ticket, show: can('ticket:create') },
        { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard, show: can('subscription:view') },
        { name: 'Reports', href: '/reports', icon: FileText, show: can('report:view') },
        { name: 'Users', href: '/users', icon: Users, show: can('user:manage') },
        { name: 'Settings', href: '/settings', icon: Settings, show: isSuperAdmin },
    ];

    return (
        <div className={`flex h-full flex-col bg-background ${isMobile ? 'w-full' : 'w-64 border-r'}`}>
            {!isMobile && (
                <Link href="/dashboard" className="flex h-14 items-center justify-center border-b px-4 gap-1.5 hover:opacity-80 transition-opacity">
                    <span className="font-extrabold text-xl tracking-tight"><span className="text-primary">Tax</span><span className="text-foreground">Prime</span></span>
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">AM</span>
                </Link>
            )}
            <nav className="flex-1 space-y-1 p-4">
                {navigation.map((item) => {
                    if (!item.show) return null;
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
