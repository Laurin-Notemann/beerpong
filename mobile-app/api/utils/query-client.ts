import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { hours, minutes } from '@/utils/time';

// --- QUERY CLIENT ---

export const createQueryClient = () => {
    const qc = new QueryClient();

    qc.setDefaultOptions({
        queries: {
            staleTime: minutes(2),
            retry: false,
            gcTime: hours(24),
        },
        mutations: {
            retry: false,
        },
    });

    return qc;
};

export const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
});
