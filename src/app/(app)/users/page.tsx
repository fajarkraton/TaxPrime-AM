'use client';

import { UserList } from '@/components/users/user-list';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';

export default function UsersPage() {
    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pengguna', isCurrent: true },
    ];

    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbNav items={breadcrumbItems} />
            <UserList />
        </div>
    );
}
