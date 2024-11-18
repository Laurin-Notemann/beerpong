import { useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-root-toast';

import {
    useDeletePlayerMutation,
    usePlayersQuery,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { mockMatches } from '@/components/mockData/matches';
import PlayerScreen from '@/components/screens/Player';
import { ConsoleLogger } from '@/utils/logging';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { mutateAsync } = useDeletePlayerMutation();

    const { id } = useLocalSearchParams<{ id: string }>();

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
            Toast.show('Failed to delete player.', {
                duration: 1500,
                position: 1,
            });
        }
    }

    const player = (playersQuery.data?.data ?? []).find((i) => i.id === id);

    if (playersQuery.isLoading) return <LoadingScreen />;

    if (!playersQuery.data?.data)
        return <ErrorScreen error={playersQuery.error} />;

    return (
        <PlayerScreen
            id={id}
            placement={6}
            name={player?.profile?.name || 'Unknown'}
            elo={216}
            matchesWon={23}
            points={211}
            hasPremium={false}
            pastSeasons={1}
            matches={mockMatches}
            onDelete={onDelete}
        />
    );
}
