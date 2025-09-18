import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
    useDeletePlayerAvatarMutation,
    useDeletePlayerMutation,
} from '@/api/calls/playerHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { useNavigation } from '@/app/navigation/useNavigation';
import { usePlayerPageScope } from '@/app/usePlayerPageScope';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import PlayerScreen from '@/components/screens/Player';
import { showErrorToast, showSuccessToast } from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';

function uint8ToBase64(bytes: Uint8Array): string {
    const CHUNK_SIZE = 0x8000; // ~32KB
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const slice = bytes.subarray(i, i + CHUNK_SIZE);
        // @ts-expect-error: Using apply on chunk avoids spread
        binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
}

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
            // @ts-expect-error TODO: type this properly
            ?.filter((i) => i.numMatches > 0) ?? [];

    // TODO: this should only be the seasons where this specific player was active
    const activeSeasons = pastSeasons;

    const deleteAvatarMutation = useDeletePlayerAvatarMutation();

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );
    const profileId = player?.profileId!;

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
            showErrorToast('Failed to delete player.');
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

        const mimeType = result?.mimeType;
        const byteArray = result?.byteArray;

        if (!result) {
            // if the image picker was cancelled by the user
            setIsUploadingAvatar(false);
            return;
        }

        if (!mimeType || !byteArray) {
            showErrorToast('Failed to process uploaded image.');
            setIsUploadingAvatar(false);
            return;
        }

        try {
            const base64 = uint8ToBase64(byteArray);

            const uri = `data:${result.type};base64,${base64}`;

            nav.navigate('cropAvatar', { uri, profileId });
        } catch (err) {
            ConsoleLogger.error('failed to process image:', err);
            showErrorToast('Failed to process image.');
        } finally {
            setIsUploadingAvatar(false);
        }
    }

    async function onDeleteAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        setIsUploadingAvatar(true);

        try {
            await deleteAvatarMutation.mutateAsync({
                groupId,
                seasonId,
                profileId,
            });
            showSuccessToast('Player avatar deleted.');
        } catch (err) {
            ConsoleLogger.error('failed to delete player avatar:', err);
            showErrorToast('Failed to delete player avatar.');
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
                prevPlayerId={undefined} // TODO
                nextPlayerId={undefined} // TODO
            />
        </>
    );
}
