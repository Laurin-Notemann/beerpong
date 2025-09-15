import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useMatchesByPlayerQuery } from '@/api/calls/matchHooks';
import {
    useDeletePlayerAvatarMutation,
    useDeletePlayerMutation,
} from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import {
    byDescendingAveragePoints,
    byDescendingElo,
    useLeaderboardProps,
} from '@/api/propHooks/leaderboardPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { eloAlgorithm } from '@/app/EloAlgorithm';
import { useNavigation } from '@/app/navigation/useNavigation';
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

    const { groupId, seasonId, group } = useGroup();

    const { currentSeasonPlayers, rawCurrentSeasonPlayers } =
        useLeaderboardProps(groupId, seasonId!);

    const deletePlayerMutation = useDeletePlayerMutation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const matchesQuery = useMatchesByPlayerQuery(groupId, seasonId, id);

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const matches = (matchesQuery.data?.data ?? []).map(
        matchDtoToMatch(rawCurrentSeasonPlayers, allowedMoves)
    );

    const seasonsQuery = useAllSeasonsQuery(groupId);

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

    if (!id) return <ErrorScreen message="Failed to find user" />;

    const player = rawCurrentSeasonPlayers.find((i) => i.id === id);

    const playerName = player?.profile?.name || 'Unknown';

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

    const profileId = player?.profile?.id;

    const isLoading =
        matchesQuery.isLoading ||
        movesQuery.isLoading ||
        seasonsQuery.isLoading;

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

    const sortedPlayers = currentSeasonPlayers.sort(
        group.data?.activeSeason?.seasonSettings?.rankingAlgorithm === 'AVERAGE'
            ? byDescendingAveragePoints
            : byDescendingElo
    );

    const placement = sortedPlayers.findIndex((i) => i.id === id) + 1;

    const minMatchesRequiredToBeRanked = 1;

    const allTimeCups = matches.reduce((sum, i) => {
        const player = i.blueTeam.concat(i.redTeam).find((i) => i.id === id);

        if (!player) return sum;

        return sum + player.moves.reduce((sum, i) => sum + i.count, 0);
    }, 0);

    return (
        <PlayerScreen
            minMatchesRequiredToBeRanked={minMatchesRequiredToBeRanked}
            isPending={isUploadingAvatar || deletePlayerMutation.isPending}
            id={id}
            placement={placement}
            name={playerName}
            elo={player?.statistics?.elo ?? eloAlgorithm.params.startingElo}
            matchesWon={
                matches.filter(
                    (i) =>
                        i.redTeam
                            .concat(i.blueTeam)
                            .find((j) =>
                                j.moves.some((k) => k.isFinish && k.count > 0)
                            )?.team ===
                        i.redTeam.concat(i.blueTeam).find((j) => j.id === id)
                            ?.team
                ).length
            }
            points={player?.statistics?.points ?? 0}
            cups={allTimeCups}
            hasPremium={false}
            pastSeasons={activeSeasons.length}
            matches={matches}
            onDelete={onDelete}
            avatarUrl={player?.profile?.avatarAsset?.url}
            onUploadAvatarPress={onUploadAvatarPress}
            onDeleteAvatarPress={onDeleteAvatarPress}
            refresh={refresh}
            rankingAlgorithm={
                group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ??
                'AVERAGE'
            }
        />
    );
}
