import { useLocalSearchParams } from 'expo-router';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import ErrorScreen from '@/components/ErrorScreen';
import { mockMatches } from '@/components/mockData/matches';
import PlayerScreen from '@/components/screens/Player';

export default function Page() {
    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { id } = useLocalSearchParams<{ id: string }>();

    if (!id) return <ErrorScreen message="Failed to find user" />;

    const player = (playersQuery.data?.data ?? []).find((i) => i.id === id);

    return (
        <PlayerScreen
            placement={6}
            name={player?.profile?.name || 'Unknown'}
            elo={216}
            matchesWon={23}
            points={211}
            hasPremium={false}
            pastSeasons={1}
            matches={mockMatches}
            onDelete={() => {}}
        />
    );
}
