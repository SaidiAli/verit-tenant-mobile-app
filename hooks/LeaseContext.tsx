import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../lib/api';
import { LeaseApiResponse } from '../types';
import { secureStorage } from '../lib/storage';
import { tenantKeys } from '../lib/queryKeys';
import { session } from '../lib/session';
import { useAuth } from './useAuth';

interface LeaseContextType {
    allLeases: LeaseApiResponse[];
    selectedLeaseId: string | null;
    selectedLease: LeaseApiResponse | null;
    isLoadingLeases: boolean;
    switchLease: (leaseId: string) => Promise<void>;
    refreshLeases: () => Promise<void>;
}

const LeaseContext = createContext<LeaseContextType | undefined>(undefined);

export function LeaseProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);

    const { data: allLeases = [], isLoading: isLoadingLeases, refetch } = useQuery({
        queryKey: tenantKeys.query(user?.id, 'all-leases'),
        queryFn: ({ signal }) => tenantApi.getAllLeases(signal),
        enabled: !!user,
    });

    useEffect(() => {
        let active = true;
        const generation = session.current();
        if (!user || allLeases.length === 0) { setSelectedLeaseId(null); return; }
        void (async () => {
            const storedId = await secureStorage.getLeaseId(user.id);
            if (!active || !session.isCurrent(generation)) return;
            const toSelect = allLeases.some(l => l.id === selectedLeaseId) ? selectedLeaseId!
                : allLeases.some(l => l.id === storedId) ? storedId!
                : (allLeases.find(l => l.status === 'active') || allLeases[0]).id;
            setSelectedLeaseId(toSelect);
        })();
        return () => { active = false; };
    }, [allLeases, user, selectedLeaseId]);

    const switchLease = async (leaseId: string) => {
        if (!user || !allLeases.some(l => l.id === leaseId)) return;
        setSelectedLeaseId(leaseId);
        await secureStorage.setLeaseId(leaseId, user.id);
    };

    const selectedLease = allLeases.find(l => l.id === selectedLeaseId) || null;
    const resolvedLeaseId = selectedLease?.id ?? null;

    return (
        <LeaseContext.Provider value={{
            allLeases,
            selectedLeaseId: resolvedLeaseId,
            selectedLease,
            isLoadingLeases: !!user && (isLoadingLeases || (allLeases.length > 0 && !resolvedLeaseId)),
            switchLease,
            refreshLeases: async () => { await refetch(); },
        }}>
            {children}
        </LeaseContext.Provider>
    );
}

export function useLease() {
    const context = useContext(LeaseContext);
    if (context === undefined) {
        throw new Error('useLease must be used within a LeaseProvider');
    }
    return context;
}
