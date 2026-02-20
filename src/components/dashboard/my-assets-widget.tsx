'use client';

import Link from 'next/link';
import { Laptop, ExternalLink, Loader2, Users } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Asset } from '@/types';

export function MyAssetsWidget() {
    const { role, department } = useAuthContext();
    const { data: assetsRaw, loading } = useFirestoreCollection({ collectionPath: 'assets' });

    // Only show for manager
    if (role !== 'manager') return null;

    const assets = (assetsRaw as unknown as Asset[]).filter(a =>
        department ? a.department === department : false
    );

    // Group by assigned user
    const userMap: Record<string, { name: string; total: number; deployed: number; maintenance: number }> = {};
    for (const a of assets) {
        if (!a.assignedTo) continue;
        const name = a.assignedToName || a.assignedTo;
        if (!userMap[name]) {
            userMap[name] = { name, total: 0, deployed: 0, maintenance: 0 };
        }
        userMap[name].total += 1;
        if (a.status === 'deployed') userMap[name].deployed += 1;
        if (a.status === 'maintenance') userMap[name].maintenance += 1;
    }

    const userData = Object.values(userMap).sort((a, b) => b.total - a.total);

    return (
        <Card className="">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        Aset per Karyawan
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {department ? `Departemen ${department}` : 'Semua departemen'}
                    </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-blue-600" asChild>
                    <Link href="/assets">
                        Lihat Semua <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : userData.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Laptop className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada aset ter-assign di departemen ini.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="font-semibold text-muted-foreground">Karyawan</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Total</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Deployed</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Maintenance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userData.map((row) => (
                                    <TableRow key={row.name}>
                                        <TableCell className="font-medium text-foreground text-sm">{row.name}</TableCell>
                                        <TableCell className="text-right">{row.total}</TableCell>
                                        <TableCell className="text-right text-emerald-600 font-medium">{row.deployed}</TableCell>
                                        <TableCell className="text-right text-red-500">{row.maintenance > 0 ? row.maintenance : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
