'use client';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Boxes, Laptop, Package, AlertTriangle, TicketCheck, CreditCard } from 'lucide-react';
import type { Asset, ServiceTicket, Subscription } from '@/types';

export function DashboardStats() {
    const { role, department, user } = useAuthContext();
    const { data: assets, loading: loadAssets } = useFirestoreCollection({ collectionPath: 'assets' });
    const { data: tickets, loading: loadTickets } = useFirestoreCollection({ collectionPath: 'serviceTickets' });
    const { data: subs, loading: loadSubs } = useFirestoreCollection({ collectionPath: 'subscriptions' });

    const loading = loadAssets || loadTickets || loadSubs;

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-5 w-[100px]" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px] mb-1" />
                            <Skeleton className="h-3 w-[120px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    let typedAssets = (assets || []) as unknown as Asset[];
    const typedTickets = (tickets || []) as unknown as ServiceTicket[];
    const typedSubs = (subs || []) as unknown as Subscription[];

    // RBAC Filter
    if (role === 'manager' && department) {
        typedAssets = typedAssets.filter((a) => a.department === department);
    } else if (role === 'employee' && user?.uid) {
        typedAssets = typedAssets.filter((a) => a.assignedTo === user.uid);
    }

    const totalAssets = typedAssets.length;
    const deployedAssets = typedAssets.filter(a => a.status === 'deployed').length;
    const maintenanceAssets = typedAssets.filter(a => a.status === 'maintenance').length;
    const inStockAssets = typedAssets.filter(a => a.status === 'in_stock').length;
    const openTickets = typedTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const activeSubs = typedSubs.filter(s => s.status === 'active' || s.status === 'expiring_soon').length;

    const cards = [
        {
            title: "Total Aset",
            value: totalAssets,
            icon: Boxes,
            description: "Inventaris IT terdaftar",
            className: "text-blue-600 dark:text-blue-400",
            bgClass: "bg-blue-50 dark:bg-blue-950/50"
        },
        {
            title: "Sedang Digunakan",
            value: deployedAssets,
            icon: Laptop,
            description: "Aset aktif (Deployed)",
            className: "text-emerald-600 dark:text-emerald-400",
            bgClass: "bg-emerald-50 dark:bg-emerald-950/50"
        },
        {
            title: "Stok Tersedia",
            value: inStockAssets,
            icon: Package,
            description: "Siap distribusi (In Stock)",
            className: "text-amber-600 dark:text-amber-400",
            bgClass: "bg-amber-50 dark:bg-amber-950/50"
        },
        {
            title: "Dalam Perbaikan",
            value: maintenanceAssets,
            icon: AlertTriangle,
            description: "Proses maintenance",
            className: "text-red-600 dark:text-red-400",
            bgClass: "bg-red-50 dark:bg-red-950/50"
        },
        {
            title: "Tiket Aktif",
            value: openTickets,
            icon: TicketCheck,
            description: "Open & In Progress",
            className: "text-violet-600 dark:text-violet-400",
            bgClass: "bg-violet-50 dark:bg-violet-950/50"
        },
        {
            title: "Langganan Aktif",
            value: activeSubs,
            icon: CreditCard,
            description: "Subscription berjalan",
            className: "text-cyan-600 dark:text-cyan-400",
            bgClass: "bg-cyan-50 dark:bg-cyan-950/50"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <Card key={i} className="group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                {card.title}
                            </CardTitle>
                            <div className={`${card.bgClass} p-2 rounded-lg`}>
                                <Icon className={`h-4 w-4 ${card.className}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
