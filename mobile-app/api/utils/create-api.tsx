import * as Sentry from '@sentry/react-native';
import OpenAPIClientAxios, { Document } from 'openapi-client-axios';
import React, {
    createContext,
    ReactNode,
    useContext,
    useRef,
    useState,
} from 'react';

import { env } from '@/api/env';
import beerpongDefinition from '@/api/generated/openapi.json';
import { RealtimeClient } from '@/api/realtime';
import { useRealtimeConnection } from '@/api/realtime/useRealtimeConnection';
import { Client as BeerPongClient } from '@/openapi/openapi';
import { useLogging } from '@/utils/useLogging';

type ApiContextType = {
    realtime: RealtimeClient;
    api: Promise<BeerPongClient>;
    isLoading: boolean;
    error: Error | null;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const openApi = new OpenAPIClientAxios({
    axiosConfigDefaults: {
        baseURL: env.apiBaseUrl,
    },
    definition: beerpongDefinition as Document,
});

export function ApiProvider({ children }: { children: ReactNode }) {
    const api = useRef(
        new Promise<BeerPongClient>(async (resolve) => {
            const awaitedApi = await openApi.getClient<BeerPongClient>();

            const client = await openApi.init();

            client.interceptors.response.use(
                (res) => {
                    return res;
                },
                (err) => {
                    if (err.response) {
                        writeLog(
                            '[api] request failed:',
                            err.config?.method?.toUpperCase(),
                            err.config?.url,
                            err.response.status,
                            err.response.data
                        );
                        Sentry.captureException(err, {
                            extra: {
                                url: err.config?.url,
                                method: err.config?.method,
                                status: err.response.status,
                                statusText: err.response.statusText,
                                responseData: err.response.data,
                            },
                        });
                    } else if (err.request) {
                        writeLog(
                            '[api] no response received:',
                            err.config?.method,
                            err.config?.url
                        );
                        Sentry.captureException(err, {
                            extra: {
                                url: err.config?.url,
                                method: err.config?.method,
                                request: err.request,
                            },
                        });
                    } else {
                        writeLog('[api] setup error:', err.message);
                        Sentry.captureException(err, {
                            extra: {
                                message: err.message,
                            },
                        });
                    }
                    return Promise.reject(err);
                }
            );
            resolve(awaitedApi);
        })
    );

    const realtime = useRealtimeConnection();
    const { writeLog } = useLogging();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<Error | null>(null);

    const contextValue: ApiContextType = {
        realtime,
        api: api.current,
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
