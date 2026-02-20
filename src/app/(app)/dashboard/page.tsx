'use client';

import { AlertCenter } from '@/components/dashboard/alert-center';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { RecentActivityFeed } from '@/components/dashboard/recent-activity-feed';
import { DepartmentSummaryTable } from '@/components/dashboard/department-summary-table';
import { OpenTicketsWidget } from '@/components/dashboard/open-tickets-widget';
import { ExpiringSubscriptionsWidget } from '@/components/dashboard/expiring-subscriptions-widget';
import { CostAnalytics } from '@/components/dashboard/cost-analytics';
import { MyAssetsWidget } from '@/components/dashboard/my-assets-widget';
import { MyTicketsWidget } from '@/components/dashboard/my-tickets-widget';
import { MaintenanceTrendWidget } from '@/components/dashboard/maintenance-trend-widget';
import { EmployeeDashboardCard } from '@/components/dashboard/employee-dashboard-card';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { LayoutDashboard } from 'lucide-react';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
}

export default function DashboardPage() {
    const { user, role } = useAuthContext();
    const firstName = user?.displayName?.split(' ')[0] || 'User';
    const isAdmin = role === 'super_admin' || role === 'admin' || role === 'it_staff';
    const isManager = role === 'manager';
    const isEmployee = role === 'employee';

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="h-7 w-7 text-slate-400" />
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {getGreeting()}, <span className="font-medium text-foreground">{firstName}</span>. Ini ringkasan TaxPrime AM hari ini.
                    </p>
                </div>
            </div>

            {/* Alert Center (all roles) */}
            <AlertCenter />

            {/* Stats (all roles — internally filtered by RBAC) */}
            <DashboardStats />

            {/* ════════════════════════════════════════════════
                 ADMIN / IT STAFF Layout (Bento Grid)
                 ════════════════════════════════════════════════ */}
            {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">
                    {/* Main Charts area */}
                    <div className="md:col-span-8 flex flex-col gap-6">
                        <DashboardCharts />
                        <MaintenanceTrendWidget />
                    </div>

                    {/* Right side widgets column */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        <OpenTicketsWidget />
                        <ExpiringSubscriptionsWidget />
                        <CostAnalytics />
                    </div>

                    {/* Bottom wide widgets */}
                    <div className="md:col-span-5">
                        <RecentActivityFeed />
                    </div>
                    <div className="md:col-span-7">
                        <DepartmentSummaryTable />
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════
                 MANAGER Layout (department-filtered)
                 ════════════════════════════════════════════════ */}
            {isManager && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">
                    {/* Main Charts */}
                    <div className="md:col-span-8 flex flex-col gap-6">
                        <DashboardCharts />
                        <DepartmentSummaryTable />
                    </div>

                    {/* Right side widgets */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        <OpenTicketsWidget />
                        <ExpiringSubscriptionsWidget />
                        <CostAnalytics />
                    </div>

                    {/* Bottom widgets */}
                    <div className="md:col-span-6">
                        <MyAssetsWidget />
                    </div>
                    <div className="md:col-span-6">
                        <RecentActivityFeed />
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════
                 EMPLOYEE Layout (simplified — my stuff only)
                 ════════════════════════════════════════════════ */}
            {isEmployee && (
                <>
                    {/* Row: My Assets + My Documents summary */}
                    <EmployeeDashboardCard />

                    {/* Row: My Tickets + My Activity */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <MyTicketsWidget />
                        <RecentActivityFeed />
                    </div>

                    {/* Charts still visible (filtered to own assets) */}
                    <DashboardCharts />
                </>
            )}

            {/* Fallback for unknown roles */}
            {!isAdmin && !isManager && !isEmployee && (
                <>
                    <DashboardCharts />
                    <RecentActivityFeed />
                </>
            )}
        </div>
    );
}
