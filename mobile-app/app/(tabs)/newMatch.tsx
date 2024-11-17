import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

import { useNavigation } from '../navigation/useNavigation';

export default function Screen() {
    const nav = useNavigation();

    const { selectedGroupId } = useGroupStore();

    const { data: groupQueryData } = useGroupQuery(selectedGroupId);

    const activeSeasonId = groupQueryData?.data?.activeSeason?.id;

    const playersQuery = usePlayersQuery(selectedGroupId, activeSeasonId);

    const matchDraft = useMatchDraftStore();

    const players: Player[] = (playersQuery.data?.data ?? []).map((i) => ({
        id: i.id!,
        name: i.profile?.name || 'Unknown',
        team:
            matchDraft.actions.getPlayers().find((j) => i.id === j.id)?.team ??
            null,
    }));

    async function onSubmit() {
        nav.navigate('newMatchPoints');
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
