// apiContext.tsx
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { getOpenAPiClient } from '@/openapi/client';

type Api = Awaited<ReturnType<typeof getOpenAPiClient>>;

// Define the API context type
type ApiContextType = {
    getApi: () => Api;
    isLoading: boolean;
    error: Error | null;
};

// Create the context with initial undefined value
const ApiContext = createContext<ApiContextType | undefined>(undefined);

// Provider component
export function ApiProvider({ children }: { children: ReactNode }) {
    const [api, setApi] = useState<Api | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeApi = async () => {
            try {
                const apiClient = await getOpenAPiClient(
                    'http://localhost:8080'
                );
                setApi(apiClient);
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

    /**
     * asserts that the api client is not null and returns it
     */
    const getApi = () => {
        if (!api)
            throw new Error(
                'getApi: API not initialized. only call getApi as soon as you actually want to perform a query'
            );

        return api;
    };

    const contextValue: ApiContextType = {
        getApi,
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

// Custom hook to use the API context
export function useApi(): ApiContextType {
    const context = useContext(ApiContext);

    if (context === undefined) {
        throw new Error('useApi must be used within an ApiProvider');
    }

    return context;
}
