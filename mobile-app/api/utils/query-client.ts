import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
    DefaultOptions,
    MutationCache,
    QueryCache,
    QueryClient,
} from '@tanstack/react-query';

import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { hours, minutes } from '@/utils/time';

/**
 * Default query configuration options
 */
const defaultQueryOptions: DefaultOptions = {
    queries: {
        staleTime: minutes(2), // Data becomes stale after 2 minutes
        retry: false, // Don't retry failed queries
        gcTime: hours(24), // Keep unused data in garbage collection for 24 hours
    },
    mutations: {
        retry: false, // Don't retry failed mutations
    },
};

/**
 * Creates and configures a new QueryClient instance
 */
export const createQueryClient = () => {
    const queryCache = new QueryCache({
        onError: (error, query) => {
            ConsoleLogger.error(`Query key ${query.queryKey} failed:`, error);
            // Without data the screen shows its own error state; with data it keeps showing
            // the cached copy, so say that the refresh failed.
            if (query.state.data !== undefined) {
                showErrorToast("Couldn't refresh.", error);
            }
        },
    });

    // Call sites usually show a more specific toast right after; it replaces this one.
    const mutationCache = new MutationCache({
        onError: (error) => {
            showErrorToast('Something went wrong.', error);
        },
    });

    const queryClient = new QueryClient({
        queryCache,
        mutationCache,
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
    key: 'QUERY_CACHE_KEY', // Key used in AsyncStorage
    throttleTime: 2000, // Minimum time (in ms) between storage operations; each write serializes the whole cache
    serialize: JSON.stringify,
    deserialize: JSON.parse,
});
