import OpenAPIClientAxios, { Document } from 'openapi-client-axios';
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import beerpongDefinition from '../../api/generated/openapi.json';
import { Client as BeerPongClient } from '../../openapi/openapi';

type ApiContextType = {
    api: Promise<BeerPongClient>;
    isLoading: boolean;
    error: Error | null;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const openApi = new OpenAPIClientAxios({
    axiosConfigDefaults: {
        baseURL: 'http://localhost:8080',
    },
    definition: beerpongDefinition as Document,
});

export function ApiProvider({ children }: { children: ReactNode }) {
    const api = openApi.getClient<BeerPongClient>();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeApi = async () => {
            try {
                await openApi.init();
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
        api,
        isLoading,
        error,
    };

    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <ApiContext.Provider value={contextValue}>
                {children}
            </ApiContext.Provider>
        </QueryClientProvider>
    );
}

export function useApi(): ApiContextType {
    const context = useContext(ApiContext);

    if (context === undefined) {
        throw new Error('useApi must be used within an ApiProvider');
    }

    return context;
}
