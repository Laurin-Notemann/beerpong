import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { useMoves, useSetDefaultMoveMutation } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import InputModal from '@/components/InputModal';
import Select from '@/components/Select';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

const NONE = '';

/** the season's default move: what holding a cup and dragging to the scorer counts as */
export default function Page() {
    const nav = useNavigation();
    const { groupId, seasonId } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);
    const setDefaultMove = useSetDefaultMoveMutation(groupId, seasonId);

    // a finish can't be the default: the last cup decides about the finish
    const moves = (movesQuery.data?.data ?? []).filter((i) => !i.finishingMove);
    const saved = moves.find((i) => i.defaultMove)?.id ?? NONE;

    const [edited, setEdited] = useState<string>();
    const value = edited ?? saved;

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Default Move' }} />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={setDefaultMove.isPending}
                    onPress={async () => {
                        try {
                            if (value !== saved) {
                                await setDefaultMove.mutateAsync(value || null);
                            }
                            nav.goBack();
                        } catch (err) {
                            ConsoleLogger.error(
                                'failed to set the default move:',
                                err
                            );
                            showErrorToast(
                                'Failed to set the default move.',
                                err
                            );
                        }
                    }}
                >
                    Save
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <Select
                    items={[
                        {
                            value: NONE,
                            title: 'None',
                            subtitle: 'A quick hit asks how the cup was hit.',
                        },
                        ...moves.map((i) => ({
                            value: i.id,
                            title: i.name || 'Unknown',
                        })),
                    ]}
                    value={value}
                    onChange={setEdited}
                    footer="In a live match, hold a cup and drag to the player who hit it: the hit counts as this move."
                />
            </InputModal>
        </>
    );
}
