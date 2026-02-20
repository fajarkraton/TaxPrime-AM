'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateDepreciation, type DepreciationResult } from '@/lib/depreciation';
import type { ReportFilterProps } from './report-tabs';

interface AssetDepRow {
    name: string;
    assetCode: string;
    category: string;
    dep: DepreciationResult;
}

export function DepreciationReport({ deptFilter }: ReportFilterProps) {
    const { data: assets, loading } = useFirestoreCollection({
        collectionPath: 'assets',
    });

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedAssets = assets as any[];
    const filteredAssets = deptFilter
        ? typedAssets.filter(a => a.department === deptFilter)
        : typedAssets;

    // Calculate depreciation for each asset
    const rows: AssetDepRow[] = filteredAssets
        .filter(a => a.purchasePrice > 0 && a.purchaseDate)
        .map(a => {
            const purchaseDate = a.purchaseDate?.toDate ? a.purchaseDate.toDate() : new Date(a.purchaseDate);
            return {
                name: a.name,
                assetCode: a.assetCode,
                category: a.category || 'other',
                dep: calculateDepreciation(a.purchasePrice, purchaseDate, a.category || 'other'),
            };
        })
        .sort((a, b) => b.dep.currentBookValue - a.dep.currentBookValue);

    // Summary stats
    const totalPurchaseValue = rows.reduce((s, r) => s + r.dep.purchasePrice, 0);
    const totalBookValue = rows.reduce((s, r) => s + r.dep.currentBookValue, 0);
    const totalDepreciation = rows.reduce((s, r) => s + r.dep.totalDepreciation, 0);
    const fullyDepreciated = rows.filter(r => r.dep.isFullyDepreciated).length;

    // Category summary for chart
    const catMap = new Map<string, { category: string; bookValue: number; depreciation: number; count: number }>();
    for (const row of rows) {
        const cat = row.category;
        if (!catMap.has(cat)) catMap.set(cat, { category: cat, bookValue: 0, depreciation: 0, count: 0 });
        const s = catMap.get(cat)!;
        s.bookValue += row.dep.currentBookValue;
        s.depreciation += row.dep.totalDepreciation;
        s.count++;
    }
    const catData = Array.from(catMap.values()).sort((a, b) => b.bookValue - a.bookValue);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">Rp {(totalPurchaseValue / 1_000_000).toFixed(1)}jt</p>
                        <p className="text-sm text-muted-foreground">Nilai Perolehan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">Rp {(totalBookValue / 1_000_000).toFixed(1)}jt</p>
                        <p className="text-sm text-muted-foreground">Nilai Buku</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-orange-600">Rp {(totalDepreciation / 1_000_000).toFixed(1)}jt</p>
                        <p className="text-sm text-muted-foreground">Total Penyusutan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{fullyDepreciated}</p>
                        <p className="text-sm text-muted-foreground">Habis Masa Pakai</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart by Category */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Nilai Buku vs Penyusutan per Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={catData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                            <Tooltip formatter={(v) => [`Rp ${(Number(v || 0) / 1_000_000).toFixed(1)}jt`]} />
                            <Bar dataKey="bookValue" name="Nilai Buku" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="depreciation" name="Penyusutan" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Asset Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Detail Penyusutan per Aset</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[400px] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead className="text-right">Harga Beli</TableHead>
                                    <TableHead className="text-right">Nilai Buku</TableHead>
                                    <TableHead className="text-right">Penyusutan</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map(r => (
                                    <TableRow key={r.assetCode}>
                                        <TableCell className="font-mono text-xs">{r.assetCode}</TableCell>
                                        <TableCell className="font-medium">{r.name}</TableCell>
                                        <TableCell className="text-right text-sm">Rp {r.dep.purchasePrice.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-right text-sm">Rp {r.dep.currentBookValue.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-right text-sm text-orange-600">-{r.dep.depreciationPercent}%</TableCell>
                                        <TableCell className="text-center">
                                            {r.dep.isFullyDepreciated
                                                ? <Badge variant="destructive" className="text-xs">Habis</Badge>
                                                : r.dep.depreciationPercent >= 80
                                                    ? <Badge className="bg-amber-500 text-xs">Rendah</Badge>
                                                    : <Badge className="bg-emerald-500 text-xs">Aktif</Badge>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            Tidak ada data penyusutan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
