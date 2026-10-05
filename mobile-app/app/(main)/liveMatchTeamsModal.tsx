import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useGroup, useSeasonQuery } from '@/api/calls/seasonHooks';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { useCloseWhenEnded, useMatchEntry } from '@/lib/useMatchEntry';
import { useTheme } from '@/theme';
import { draftPlayers } from '@/zustand/matchEditDraftStore';

/**
 * A live match's teams, to add a player who joins mid-game (or move or take one out). Every
 * change goes into the live match's log, so all phones see it. Opened from the live match header.
 */
export default function Page() {
    const { liveMatchId } = useLocalSearchParams<{ liveMatchId: string }>();
    const theme = useTheme();

    const entry = useMatchEntry(liveMatchId);
    useCloseWhenEnded(entry.isEnded);

    const { groupId } = useGroup();
    const playersQuery = usePlayersQuery(groupId, entry.seasonId);
    const settings = useSeasonQuery(groupId, entry.seasonId ?? null).data?.data
        ?.seasonSettings;

    const inMatch = draftPlayers(entry);
    const players = (playersQuery.data?.data ?? [])
        .filter((i) => i.activeThisSeason)
        .map<Player>((i) => ({
            id: i.id!,
            name: i.profile?.name || 'Unknown',
            team: inMatch.find((j) => j.playerId === i.id)?.team ?? null,
            avatarUrl: i.profile?.avatarUrl,
        }));

    return (
        <View style={{ flex: 1, backgroundColor: theme.panel.dark.bg }}>
            <Stack.Screen options={{ headerTitle: 'Teams' }} />
            <NewMatchAssignTeams
                randomTeamsMode={null}
                onRandomTeamSelect={() => {}}
                minTeamSize={settings?.minTeamSize ?? 1}
                maxTeamSize={settings?.maxTeamSize ?? 10}
                players={players}
                setTeam={entry.actions.setPlayerTeam}
            />
        </View>
    );
}
