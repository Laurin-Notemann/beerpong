import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
    DefaultOptions,
    MutationCache,
    onlineManager,
    QueryCache,
    QueryClient,
} from '@tanstack/react-query';
import { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { isCreateMatch, shouldPersistMutation } from '@/api/calls/matchQueue';
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
        // Only match entry waits for the network (matchQueue); everything else fails
        // right away offline, and useRefetchEverythingOnWifiReconnect refetches.
        networkMode: 'always',
        refetchOnReconnect: false,
    },
    mutations: {
        retry: false, // Don't retry failed mutations
        networkMode: 'always',
    },
};

// React Query only knows the browser's online events; on a phone NetInfo says. Unknown
// reachability (null) counts as online, like the API client's offline check.
onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) =>
        setOnline(
            state.isConnected !== false && state.isInternetReachable !== false
        )
    )
);

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

    // Call sites usually show a more specific toast right after; it replaces this one. A
    // rejected queued match gets an alert instead (MatchQueue).
    const mutationCache = new MutationCache({
        onError: (error, _variables, _context, mutation) => {
            if (isCreateMatch(mutation)) return;
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

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
    persister,
    // the persisted cache holds matches entered offline, so it outlives a week without the app
    maxAge: hours(24 * 7),
    dehydrateOptions: { shouldDehydrateMutation: shouldPersistMutation },
};
