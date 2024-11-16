// apiContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getOpenAPiClient } from '@/openapi/client';

// Define the API context type
type ApiContextType = {
  api: Awaited<ReturnType<typeof getOpenAPiClient>> | null;
  isLoading: boolean;
  error: Error | null;
};

// Create the context with initial undefined value
const ApiContext = createContext<ApiContextType | undefined>(undefined);

// Provider component
export function ApiProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<ApiContextType['api']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeApi = async () => {
      try {
        const apiClient = await getOpenAPiClient();
        setApi(apiClient);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize API client'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeApi();
  }, []);

  const contextValue: ApiContextType = {
    api,
    isLoading,
    error
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
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
