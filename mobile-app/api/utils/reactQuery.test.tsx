import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ignoreSeason, QK } from './reactQuery';

describe('ignoreSeason', () => {
    const queryKey = [QK.group, 'group:1', QK.season, 'season:1', QK.players];

    const queryFn = vi.fn(() => Promise.resolve('data'));

    const queryClient = new QueryClient();

    afterEach(() => {
        queryClient.clear();
        queryFn.mockClear();
    });

    it('should invalidate a query and refetch data', async () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        const { result } = renderHook(
            // staleTime: Infinity to prevent a false positive refetch
            () => useQuery({ queryKey, queryFn, staleTime: Infinity }),
            { wrapper }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(queryFn).toHaveBeenCalledTimes(1);

        queryClient.invalidateQueries({
            predicate: ignoreSeason([QK.group, 'group:1', QK.players]),
        });

        await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
        expect(result.current.data).toBe('data');
    });
});
