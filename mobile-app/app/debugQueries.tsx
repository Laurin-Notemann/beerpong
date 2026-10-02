import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import React, { useEffect, useReducer } from 'react';

import { DebugRow, DebugScreen } from '@/components/debug/DebugScreen';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { showSuccessToast } from '@/toast';

export default function Page() {
    const queryClient = useQueryClient();
    const cache = queryClient.getQueryCache();
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    useEffect(() => cache.subscribe(rerender), [cache]);

    const queries = cache
        .getAll()
        .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);

    return (
        <DebugScreen title="Query Cache">
            <MenuSection title="Actions">
                <MenuItem
                    border={false}
                    title="Refetch all"
                    headIcon="refresh"
                    onPress={async () => {
                        await queryClient.invalidateQueries();
                        showSuccessToast('Refetched');
                    }}
                />
                <MenuItem
                    title="Clear cache (also the persisted copy)"
                    headIcon="delete-outline"
                    type="danger"
                    confirmationPrompt={{
                        title: 'Clear query cache?',
                        description:
                            'Everything is refetched from the backend afterwards.',
                        buttonText: 'Clear',
                        type: 'dangerRed',
                    }}
                    onPress={() => {
                        queryClient.clear();
                        showSuccessToast('Cache cleared');
                    }}
                />
            </MenuSection>
            <MenuSection title={`${queries.length} queries`}>
                {queries.map((q, idx) => (
                    <DebugRow
                        key={q.queryHash}
                        first={idx === 0}
                        label={JSON.stringify(q.queryKey)}
                        value={[
                            q.state.status,
                            q.state.fetchStatus,
                            q.state.dataUpdatedAt
                                ? dayjs(q.state.dataUpdatedAt).format(
                                      'HH:mm:ss'
                                  )
                                : 'never',
                            q.state.error?.message,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    />
                ))}
            </MenuSection>
        </DebugScreen>
    );
}
