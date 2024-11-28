import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

import { useNavigation } from '../navigation/useNavigation';

export default function Screen() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const matchDraft = useMatchDraftStore();

    const players = (playersQuery.data?.data ?? []).map<Player>((i) => ({
        id: i.id!,
        name: i.profile?.name || 'Unknown',
        team:
            matchDraft.actions.getPlayers().find((j) => i.id === j.playerId)
                ?.team ?? null,

        avatarUrl: i.profile?.avatarAsset?.url,
    }));

    async function onSubmit() {
        nav.navigate('newMatchPoints');
        nav.navigate('assignPointsToPlayerModal', { pageIdx: 0 });
    }

    return (
        <GestureHandlerRootView>
            <NewMatchAssignTeams
                players={players}
                setTeam={matchDraft.actions.setPlayerTeam}
                onSubmit={onSubmit}
            />
        </GestureHandlerRootView>
    );
}
