'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, DollarSign } from 'lucide-react';
import { calculateDepreciation, type DepreciationResult } from '@/lib/depreciation';
import { Badge } from '@/components/ui/badge';

interface DepreciationCardProps {
    purchasePrice: number;
    purchaseDate: Date | null;
    category: string;
}

export function DepreciationCard({ purchasePrice, purchaseDate, category }: DepreciationCardProps) {
    if (!purchaseDate || !purchasePrice || purchasePrice <= 0) {
        return null;
    }

    const dep: DepreciationResult = calculateDepreciation(purchasePrice, purchaseDate, category);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-orange-50 dark:bg-orange-950 p-1.5 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <CardTitle className="text-base">Penyusutan Aset</CardTitle>
                    <Badge variant="outline" className="text-[10px] ml-auto">DDB</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress bar */}
                <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Terpakai {dep.depreciationPercent}%</span>
                        {dep.isFullyDepreciated && (
                            <Badge variant="secondary" className="text-[10px]">Habis</Badge>
                        )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all ${dep.depreciationPercent >= 80 ? 'bg-red-500' : dep.depreciationPercent >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${dep.depreciationPercent}%` }}
                        />
                    </div>
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nilai Buku</p>
                        <p className="text-sm font-semibold mt-0.5 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {(dep.currentBookValue / 1_000_000).toFixed(1)}jt
                        </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Terdepresiasi</p>
                        <p className="text-sm font-semibold mt-0.5 text-orange-600">
                            -{(dep.totalDepreciation / 1_000_000).toFixed(1)}jt
                        </p>
                    </div>
                </div>

                {/* Details */}
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                    <div className="flex justify-between">
                        <span>Harga Beli</span>
                        <span className="font-medium text-foreground">Rp {dep.purchasePrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Nilai Residu ({DEFAULT_DEPRECIATION_CONFIG.salvageValuePercent}%)</span>
                        <span>Rp {dep.salvageValue.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Umur Ekonomis</span>
                        <span>{dep.usefulLife} tahun</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Usia Sekarang</span>
                        <span>{dep.ageInYears} tahun ({dep.ageInMonths} bulan)</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tarif DDB</span>
                        <span>{(dep.ddbRate * 100).toFixed(0)}% / tahun</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Depresiasi Tahun Ini</span>
                        <span>Rp {dep.annualDepreciation.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Re-export for convenience
import { DEFAULT_DEPRECIATION_CONFIG } from '@/lib/depreciation';
