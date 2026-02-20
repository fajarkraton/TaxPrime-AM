'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AssetReport } from './asset-report';
import { TicketReport } from './ticket-report';
import { SubscriptionReport } from './subscription-report';
import { VendorReport } from './vendor-report';
import { DepreciationReport } from './depreciation-report';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Boxes, TicketCheck, CreditCard, CalendarDays, Store, TrendingDown } from 'lucide-react';

export interface ReportFilterProps {
    dateFrom?: string;
    dateTo?: string;
    deptFilter?: string;
}

export function ReportTabs() {
    const [activeTab, setActiveTab] = useState('assets');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const { user } = useAuthContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData = user as any;
    const isManager = userData?.role === 'manager';
    const deptFilter = isManager ? (userData?.department as string || '') : undefined;

    const filterProps: ReportFilterProps = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        deptFilter,
    };

    return (
        <div className="space-y-4">
            {/* Date Range Picker */}
            <div className="flex flex-wrap items-center gap-3">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Periode:</span>
                <Input
                    type="date"
                    className="w-[160px] h-9 text-sm"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="Dari"
                />
                <span className="text-sm text-slate-400">—</span>
                <Input
                    type="date"
                    className="w-[160px] h-9 text-sm"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="Sampai"
                />
                {(dateFrom || dateTo) && (
                    <button
                        className="text-xs text-slate-500 underline hover:text-slate-700"
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                    >
                        Reset
                    </button>
                )}
                {isManager && deptFilter && (
                    <span className="ml-auto text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                        Dept: {deptFilter}
                    </span>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-12 bg-muted p-1 rounded-lg">
                    <TabsTrigger value="assets" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-sm">
                        <Boxes className="h-4 w-4" />
                        <span className="hidden sm:inline">Aset</span>
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-sm">
                        <TicketCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Tiket</span>
                    </TabsTrigger>
                    <TabsTrigger value="subscriptions" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-sm">
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden sm:inline">Langganan</span>
                    </TabsTrigger>
                    <TabsTrigger value="vendor" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-sm">
                        <Store className="h-4 w-4" />
                        <span className="hidden sm:inline">Vendor</span>
                    </TabsTrigger>
                    <TabsTrigger value="depreciation" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-sm">
                        <TrendingDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Penyusutan</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="assets" className="mt-6">
                    <AssetReport {...filterProps} />
                </TabsContent>
                <TabsContent value="tickets" className="mt-6">
                    <TicketReport {...filterProps} />
                </TabsContent>
                <TabsContent value="subscriptions" className="mt-6">
                    <SubscriptionReport {...filterProps} />
                </TabsContent>
                <TabsContent value="vendor" className="mt-6">
                    <VendorReport {...filterProps} />
                </TabsContent>
                <TabsContent value="depreciation" className="mt-6">
                    <DepreciationReport {...filterProps} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

