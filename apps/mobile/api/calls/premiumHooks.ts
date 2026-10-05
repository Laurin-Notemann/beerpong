import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Paths } from '@/openapi/openapi';

/**
 * Sends a store purchase of Versus Premium to the API, which unlocks every
 * group this install created, and with `unlockGroup` (right after buying) the
 * group too. Safe to repeat. `token` is the purchase's `purchaseToken` (the
 * JWS on iOS).
 */
export const useRedeemPurchaseMutation = () => {
    const { api } = useApi();
    const qc = useQueryClient();

    return useMutation<
        Paths.RedeemPurchase.Responses.$200 | null,
        Error,
        { groupId: ApiId; token: string; unlockGroup: boolean }
    >({
        mutationFn: async ({ groupId, token, unlockGroup }) => {
            const res = await (
                await api
            ).redeemPurchase(
                { groupId },
                {
                    store: Platform.OS === 'ios' ? 'apple' : 'google',
                    token,
                    unlockGroup,
                }
            );
            return res.data;
        },
        onSuccess: async (_, { groupId }) => {
            // the response has no match and player counts; the other unlocked
            // groups arrive as groupUpdate events
            await qc.invalidateQueries({
                queryKey: [QK.group, groupId],
                exact: true,
            });
            await qc.invalidateQueries({ queryKey: [QK.group, 'myGroups'] });
        },
        onError: captureMutationErr('redeemPurchase'),
    });
};
