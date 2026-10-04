import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
    useDeletePlayerAvatarMutation,
    useDeletePlayerMutation,
} from '@/api/calls/playerHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import PlayerScreen from '@/components/screens/Player';
import { triggerHapticBump } from '@/haptics';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { putTemp } from '@/lib/tempRouteStore';
import { usePlayerPageScope } from '@/lib/usePlayerPageScope';
import { showErrorToast, showSuccessToast } from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const router = useRouter();
    const nav = useNavigation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const { groupId, seasonId } = useGroup();

    const deletePlayerMutation = useDeletePlayerMutation();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const player = seasonsQuery.data?.data
        ?.flatMap((i) => i.players)
        ?.find((i) => i.id === id);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO: type this properly
            ?.filter((i) => i.numMatches > 0) ?? [];

    // TODO: this should only be the seasons where this specific player was active
    const activeSeasons = pastSeasons;

    const deleteAvatarMutation = useDeletePlayerAvatarMutation();

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );
    const profileId = player?.profileId ?? '';

    const { scopes } = usePlayerPageScope(profileId);

    if (!id) return <ErrorScreen message="Failed to find user" />;

    const playerName = player?.name || 'Unknown';

    async function onDelete() {
        if (!groupId || !seasonId) return;

        try {
            await deletePlayerMutation.mutateAsync({
                groupId,
                seasonId,
                id,
            });
            showSuccessToast(`Deleted player "${playerName}".`);
            router.back();
        } catch (err) {
            ConsoleLogger.error('failed to delete player:', err);
            showErrorToast('Failed to delete player.', err);
        }
    }

    const isLoading = seasonsQuery.isLoading;

    if (isLoading) return <LoadingScreen />;

    async function onUploadAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        setIsUploadingAvatar(true);

        const [result] = await launchImageLibrary({
            // mediaTypes: ['images'],
            selectionLimit: 1,
        });

        setIsUploadingAvatar(false);

        // cancelled
        if (!result) return;

        triggerHapticBump('light');

        // the crop screen reads the picked file itself
        const imageKey = putTemp<string>(result.uri);
        nav.navigate('cropAvatar', { imageKey, profileId });
    }

    async function onDeleteAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        setIsUploadingAvatar(true);

        try {
            await deleteAvatarMutation.mutateAsync({
                groupId,
                profileId,
            });
            showSuccessToast('Player avatar deleted.');
        } catch (err) {
            ConsoleLogger.error('failed to delete player avatar:', err);
            showErrorToast('Failed to delete player avatar.', err);
        } finally {
            setIsUploadingAvatar(false);
        }
    }

    return (
        <>
            <PlayerScreen
                scopes={scopes}
                name={playerName}
                isPending={isUploadingAvatar || deletePlayerMutation.isPending}
                id={id}
                profileId={profileId!}
                hasPremium={false}
                pastSeasons={activeSeasons.length}
                onDelete={onDelete}
                avatarUrl={player?.avatarUrl}
                onUploadAvatarPress={onUploadAvatarPress}
                onDeleteAvatarPress={onDeleteAvatarPress}
                refresh={refresh}
            />
        </>
    );
}
