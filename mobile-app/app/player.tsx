import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useMatchesByPlayerQuery } from '@/api/calls/matchHooks';
import {
    useDeletePlayerMutation,
    usePlayersQuery,
    useUpdatePlayerAvatarMutation,
} from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import {
    byDescendingAveragePoints,
    useLeaderboardProps,
} from '@/api/propHooks/leaderboardPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { QK, replaceWildcards } from '@/api/utils/reactQuery';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import PlayerScreen from '@/components/screens/Player';
import { showErrorToast, showSuccessToast } from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { mutateAsync } = useDeletePlayerMutation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const matchesQuery = useMatchesByPlayerQuery(groupId, seasonId, id);

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const matches = (matchesQuery.data?.data ?? []).map(
        matchDtoToMatch(playersQuery.data?.data, allowedMoves)
    );

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons = seasonsQuery.data?.data ?? [];

    const qc = useQueryClient();

    // TODO: this should only be the seasons where this specific player was active
    const activeSeasons = seasons;

    const uploadAvatarMutation = useUpdatePlayerAvatarMutation();

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const { players } = useLeaderboardProps(groupId, seasonId ?? null);

    if (!id) return <ErrorScreen message="Failed to find user" />;

    const player = (playersQuery.data?.data ?? []).find((i) => i.id === id);

    const playerName = player?.profile?.name || 'Unknown';

    async function onDelete() {
        if (!groupId || !seasonId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                id,
            });
            showSuccessToast(`Deleted player "${playerName}".`);
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to delete player:', err);
            showErrorToast('Failed to delete player.');
        }
    }

    const profileId = player?.profile?.id;

    if (playersQuery.isLoading) return <LoadingScreen />;

    if (!playersQuery.data?.data)
        return <ErrorScreen error={playersQuery.error} />;

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
            await uploadAvatarMutation.mutateAsync({
                groupId,
                seasonId,
                profileId,
                byteArray,
                mimeType,
            });
            await qc.invalidateQueries({
                predicate: replaceWildcards([
                    QK.group,
                    groupId,
                    QK.season,
                    '*',
                    QK.players,
                ]),
            });
            showSuccessToast('Player avatar updated.');
        } catch (err) {
            ConsoleLogger.error('failed to upload player avatar:', err);
            showErrorToast('Failed to upload player avatar.');
        } finally {
            setIsUploadingAvatar(false);
        }
    }

    const sortedPlayers = players.sort(byDescendingAveragePoints);

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
            isPending={isUploadingAvatar}
            id={id}
            placement={placement}
            name={playerName}
            elo={216}
            matchesWon={player?.statistics?.matches ?? 0}
            points={player?.statistics?.points ?? 0}
            cups={allTimeCups}
            hasPremium={false}
            pastSeasons={activeSeasons.length - 1}
            matches={matches}
            onDelete={onDelete}
            avatarUrl={player?.profile?.avatarAsset?.url}
            onUploadAvatarPress={onUploadAvatarPress}
        />
    );
}
