import { useLocalSearchParams } from 'expo-router';

import {
    useDeletePlayerMutation,
    usePlayersQuery,
    useUpdatePlayerAvatarMutation,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { mockMatches } from '@/components/mockData/matches';
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

    return (
        <PlayerScreen
            id={id}
            placement={6}
            name={player?.profile?.name || 'Unknown'}
            elo={216}
            matchesWon={player?.statistics?.matches ?? 0}
            points={player?.statistics?.points ?? 0}
            hasPremium={false}
            pastSeasons={1}
            matches={mockMatches}
            onDelete={onDelete}
            avatarUrl={player?.profile?.avatarAsset?.url}
            onUploadAvatarPress={onUploadAvatarPress}
        />
    );
}
