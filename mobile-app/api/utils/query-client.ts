import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { hours, minutes } from '@/utils/time';

/**
 * Default query configuration options
 */
const defaultQueryOptions = {
    queries: {
        staleTime: minutes(2),    // Data becomes stale after 2 minutes
        retry: false,             // Don't retry failed queries
        gcTime: hours(24),        // Keep unused data in garbage collection for 24 hours
    },
    mutations: {
        retry: false,             // Don't retry failed mutations
    },
} as const;

/**
 * Creates and configures a new QueryClient instance
 */
export const createQueryClient = () => {
    const queryClient = new QueryClient({
        defaultOptions: defaultQueryOptions,
    });
    
    return queryClient;
};

/**
 * Persister configuration for AsyncStorage
 * This allows query cache to persist between app sessions
 */
export const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'QUERY_CACHE_KEY',      // Key used in AsyncStorage
    throttleTime: 1000,          // Minimum time (in ms) between storage operations
    serialize: JSON.stringify,
    deserialize: JSON.parse,
});
