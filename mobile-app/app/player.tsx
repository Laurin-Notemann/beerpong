import { useLocalSearchParams } from 'expo-router';

import { useMatchesByPlayerQuery } from '@/api/calls/matchHooks';
import {
    useDeletePlayerMutation,
    usePlayersQuery,
    useUpdatePlayerAvatarMutation,
} from '@/api/calls/playerHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import PlayerScreen from '@/components/screens/Player';
import { showErrorToast } from '@/toast';
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

    const matches = (matchesQuery.data?.data ?? []).map(
        matchDtoToMatch(playersQuery.data?.data)
    );

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons = seasonsQuery.data?.data ?? [];

    // TODO: this should only be the seasons where this specific player was active
    const activeSeasons = seasons;

    const { mutateAsync: uploadAvatarAsync } = useUpdatePlayerAvatarMutation();

    if (!id) return <ErrorScreen message="Failed to find user" />;

    async function onDelete() {
        if (!groupId || !seasonId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                id,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to delete player:', err);
            showErrorToast('Failed to delete player.');
        }
    }

    const player = (playersQuery.data?.data ?? []).find((i) => i.id === id);

    const profileId = player?.profile?.id;

    if (playersQuery.isLoading) return <LoadingScreen />;

    if (!playersQuery.data?.data)
        return <ErrorScreen error={playersQuery.error} />;

    async function onUploadAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        const [result] = await launchImageLibrary({
            // mediaTypes: ['images'],
            selectionLimit: 1,
        });
        const mimeType = result?.mimeType;
        const byteArray = result?.byteArray;

        if (!mimeType || !byteArray) return;

        try {
            await uploadAvatarAsync({
                groupId,
                seasonId,
                profileId,
                byteArray,
                mimeType,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to upload player avatar:', err);
            showErrorToast('Failed to upload player avatar.');
        }
    }

    const sortedPlayers = (playersQuery.data?.data ?? []).sort(
        (a, b) => b.statistics?.points! - a.statistics?.points!
    );
    const placement = sortedPlayers.findIndex((i) => i.id === id) + 1;

    return (
        <PlayerScreen
            id={id}
            placement={placement}
            name={player?.profile?.name || 'Unknown'}
            elo={216}
            matchesWon={player?.statistics?.matches ?? 0}
            points={player?.statistics?.points ?? 0}
            hasPremium={false}
            pastSeasons={activeSeasons.length - 1}
            matches={matches}
            onDelete={onDelete}
            avatarUrl={player?.profile?.avatarAsset?.url}
            onUploadAvatarPress={onUploadAvatarPress}
        />
    );
}
