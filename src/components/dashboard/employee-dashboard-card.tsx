'use client';

import Link from 'next/link';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, FileSignature, ArrowRight } from 'lucide-react';
import type { Asset } from '@/types';

interface DocItem {
    id: string;
    recipientUid: string;
    status: string;
    [key: string]: unknown;
}

export function EmployeeDashboardCard() {
    const { user } = useAuthContext();
    const { data: allAssets } = useFirestoreCollection({ collectionPath: 'assets', pageSize: 1000 });
    const { data: allDocs } = useFirestoreCollection({ collectionPath: 'documents', pageSize: 1000 });

    if (!user) return null;

    const myAssets = (allAssets as unknown as Asset[]).filter(a => a.assignedTo === user.uid);
    const pendingDocs = (allDocs as unknown as DocItem[]).filter(d => d.recipientUid === user.uid && d.status === 'pending');

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/my-assets">
                <Card className="hover:outline-blue-300 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 dark:bg-blue-950/50 p-2.5 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Aset Saya</p>
                                <p className="text-2xl font-bold text-foreground">{myAssets.length} <span className="text-sm font-normal text-muted-foreground">unit</span></p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                    </CardContent>
                </Card>
            </Link>

            <Link href="/my-documents">
                <Card className="hover:outline-violet-300 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-violet-50 p-2.5 rounded-lg group-hover:bg-violet-100 transition-colors">
                                <FileSignature className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Dokumen Menunggu</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-foreground">{pendingDocs.length}</p>
                                    {pendingDocs.length > 0 && (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                            Perlu TTD
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
