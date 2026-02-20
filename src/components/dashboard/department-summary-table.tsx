'use client';

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Building2 } from 'lucide-react';
import type { Asset } from '@/types';

export function DepartmentSummaryTable() {
    const { role, department, user } = useAuthContext();
    const { data: assets, loading, error } = useFirestoreCollection({ collectionPath: 'assets' });

    if (error) {
        return <div className="text-red-500 rounded-lg bg-red-50 dark:bg-red-950/30 p-4">Gagal memuat rekapitulasi departemen.</div>;
    }

    if (loading || !assets) {
        return (
            <Card className="">
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    let typedAssets = assets as unknown as Asset[];

    // Terapkan isolasi departemen untuk Manager
    if (role === 'manager' && department) {
        typedAssets = typedAssets.filter((a) => a.department === department);
    } else if (role === 'employee' && user?.uid) {
        typedAssets = typedAssets.filter((a) => a.assignedTo === user.uid);
    }

    // Group assets by Department
    const deptStats = typedAssets.reduce((acc, asset) => {
        const dept = asset.department || 'Unassigned';
        if (!acc[dept]) {
            acc[dept] = { total: 0, deployed: 0, maintenance: 0 };
        }
        acc[dept].total += 1;
        if (asset.status === 'deployed') acc[dept].deployed += 1;
        if (asset.status === 'maintenance') acc[dept].maintenance += 1;
        return acc;
    }, {} as Record<string, { total: number, deployed: number, maintenance: number }>);

    const tableData = Object.keys(deptStats).map(name => ({
        name,
        ...deptStats[name]
    })).sort((a, b) => b.total - a.total);

    return (
        <Card className="col-span-4 ">
            <CardHeader className="pb-3 border-b mb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    Beban Aset Departemen
                </CardTitle>
                <CardDescription>
                    Distribusi alokasi perangkat per divisi
                </CardDescription>
            </CardHeader>
            <CardContent>
                {tableData.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">Belum ada data departemen.</p>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="font-semibold text-muted-foreground">Departemen</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Total Aset</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Digunakan</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Maintenance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row) => (
                                    <TableRow key={row.name}>
                                        <TableCell className="font-medium text-foreground">{row.name}</TableCell>
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
