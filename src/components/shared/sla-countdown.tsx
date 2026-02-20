'use client';

import { useState, useEffect } from 'react';
import { type Timestamp } from 'firebase/firestore';

interface SlaCountdownProps {
    targetTime: Timestamp;
    breached?: boolean;
}

export function SlaCountdown({ targetTime, breached = false }: SlaCountdownProps) {
    const [timeLeft, setTimeLeft] = useState('');
    const [urgency, setUrgency] = useState<'safe' | 'warning' | 'danger' | 'breached'>('safe');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const targetData = targetTime as unknown as { seconds?: number };
            const target = (targetTime.toMillis ? targetTime.toMillis() : (targetData.seconds || 0) * 1000);
            const diff = target - now;

            if (breached || diff <= 0) {
                setUrgency('breached');
                const overdue = Math.abs(diff);
                const hours = Math.floor(overdue / 3600000);
                const minutes = Math.floor((overdue % 3600000) / 60000);
                setTimeLeft(`+${hours}j ${minutes}m (SLA breach)`);
                return;
            }

            // 48 hours in MS for total estimate if targetTime doesn't have start time associated. Simple assumption logic.
            const totalMs = 48 * 3600 * 1000;
            const percentage = diff / totalMs;

            if (percentage < 0.25) setUrgency('danger');
            else if (percentage < 0.5) setUrgency('warning');
            else setUrgency('safe');

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            setTimeLeft(`${hours}j ${minutes}m tersisa`);
        }, 60000);

        // Initial check
        const now = Date.now();
        const targetDataInit = targetTime as unknown as { seconds?: number };
        const target = (targetTime.toMillis ? targetTime.toMillis() : (targetDataInit.seconds || 0) * 1000);
        const diff = target - now;
        if (diff <= 0 || breached) {
            setUrgency('breached');
            const overdue = Math.abs(diff);
            const hours = Math.floor(overdue / 3600000);
            const minutes = Math.floor((overdue % 3600000) / 60000);
            setTimeLeft(`+${hours}j ${minutes}m (SLA breach)`);
        } else {
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            setTimeLeft(`${hours}j ${minutes}m tersisa`);
        }

        return () => clearInterval(interval);
    }, [targetTime, breached]);

    const colorClass = {
        safe: 'text-green-600 bg-green-50',
        warning: 'text-yellow-600 bg-yellow-50',
        danger: 'text-red-600 bg-red-50',
        breached: 'text-red-700 bg-red-100 animate-pulse',
    }[urgency];

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
            {timeLeft}
        </span>
    );
}
