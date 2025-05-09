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
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                queryClient.invalidateQueries(); // refetch all queries
            }
        });
        return unsubscribe;
    }, [queryClient]);
};
