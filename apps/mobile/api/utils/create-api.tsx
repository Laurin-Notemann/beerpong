import * as Sentry from '@sentry/react-native';
import NetInfo from '@react-native-community/netinfo';
import OpenAPIClientAxios, { Document } from 'openapi-client-axios';
import React, { createContext, ReactNode, useContext, useState } from 'react';

import { env } from '@/api/env';
import beerpongDefinition from '@/api/generated/openapi.json';
import { RealtimeClient } from '@/api/realtime';
import { useRealtimeConnection } from '@/api/realtime/useRealtimeConnection';
import { installApiInterceptors } from '@/api/utils/apiInterceptors';
import { useAuth } from '@/lib/auth/useAuth';
import { Client as BeerPongClient } from '@/openapi/openapi';
import { useLogging } from '@/utils/useLogging';

type ApiContextType = {
    realtime: RealtimeClient | null;
    connectRealtime: (groupIds: string[]) => void;
    api: Promise<BeerPongClient>;
    isLoading: boolean;
    error: Error | null;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const openApiConfig = {
    axiosConfigDefaults: {
        baseURL: env.apiBaseUrl,
        // A server that accepts connections but never answers would otherwise spin forever.
        timeout: 15_000,
    },
    definition: beerpongDefinition as Document,
};

const openApi = new OpenAPIClientAxios(openApiConfig);

// Signup and token refresh go through their own client, so they don't run into
// the auth interceptor below.
const authApi = new OpenAPIClientAxios(openApiConfig);

export function ApiProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const { writeLog } = useLogging();

    // Resolves as soon as the client is set up; auth happens per request, so a failed
    // login surfaces as a failed (and retried) query instead of a dead client.
    const [api] = useState(async () => {
        const client = await openApi.init<BeerPongClient>();
        const authClient = await authApi.init<BeerPongClient>();

        installApiInterceptors(client, {
            getAccessToken: async () =>
                (await auth.getAccessToken(authClient)).accessToken,
            invalidateAccessToken: auth.invalidateAccessToken,
            // NetInfo is already in the app (useRefetchEverythingOnWifiReconnect). Unknown
            // reachability (null) counts as online.
            isOffline: async () => {
                const state = await NetInfo.fetch();
                return (
                    state.isConnected === false ||
                    state.isInternetReachable === false
                );
            },
            reporter: Sentry,
            log: writeLog,
        });
        return client;
    });

    const { realtime, connectRealtime } = useRealtimeConnection();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<Error | null>(null);

    const contextValue: ApiContextType = {
        realtime,
        connectRealtime,
        api,
        isLoading,
        error,
    };

    return (
        <ApiContext.Provider value={contextValue}>
            {children}
        </ApiContext.Provider>
    );
}

export function useApi(): ApiContextType {
    const context = useContext(ApiContext);

    if (context === undefined) {
        throw new Error('useApi must be used within an ApiProvider');
    }

    return context;
}
