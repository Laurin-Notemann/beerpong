import * as Sentry from '@sentry/react-native';
import OpenAPIClientAxios, { Document } from 'openapi-client-axios';
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

import { useLogging } from '@/utils/useLogging';

import beerpongDefinition from '../../api/generated/openapi.json';
import { Client as BeerPongClient } from '../../openapi/openapi';
import { env } from '../env';
import { RealtimeClient } from '../realtime';
import { useRealtimeConnection } from '../realtime/useRealtimeConnection';

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
    const api = openApi.getClient<BeerPongClient>();

    const realtime = useRealtimeConnection();
    const { writeLog } = useLogging();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeApi = async () => {
            try {
                await openApi.init();

                const awaitedApi = await api;

                awaitedApi.interceptors.response.use(
                    (res) => res,
                    (err) => {
                        if (err.response) {
                            writeLog(
                                '[api] request failed:',
                                err.config?.method,
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
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err
                        : new Error('Failed to initialize API client')
                );
            } finally {
                setIsLoading(false);
            }
        };
        initializeApi();
    }, []);

    const contextValue: ApiContextType = {
        realtime,
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
