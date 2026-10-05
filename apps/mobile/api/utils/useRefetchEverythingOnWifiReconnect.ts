import NetInfo from '@react-native-community/netinfo';
import { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * we always want our users to be in sync with each other.
 * the way we usually do this is by refetching data when we receive a websocket event from the server.
 * when we're offline, we can't do that, so we refetch everything when we come back online.
 *
 * TODO: tie this to `this.ws.addEventListener('open')` instead of using NetInfo
 */
export const useRefetchEverythingOnWifiReconnect = (
    queryClient: QueryClient
) => {
    useEffect(() => {
        // NetInfo reports the current state right away and on every change (e.g. wifi to
        // cellular); only coming back from offline means we may have missed updates.
        let wasConnected: boolean | null = null;
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (wasConnected === false && state.isConnected) {
                queryClient.invalidateQueries();
            }
            wasConnected = state.isConnected;
        });
        return unsubscribe;
    }, [queryClient]);
};
