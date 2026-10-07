import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import {
    useCancelTournament,
    useTournament,
} from '@/api/calls/tournamentHooks';
import { liveMatchKey } from '@/api/liveMatch/liveMatchCache';
import { startLiveMatch } from '@/api/liveMatch/useLiveMatch';
import { Icon } from '@/components/Icon';
import { useNextTokens } from '@/components/next/tokens';
import { BracketCanvas } from '@/components/tournament/BracketCanvas';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import {
    standings,
    TOURNAMENT_COLOR,
    TOURNAMENT_ICON,
    type TournamentFixture,
    type TournamentStage,
} from '@/lib/tournament';
import { useAndroidIcon } from '@/lib/useAndroidIcon';
import { useInsets } from '@/lib/useInsets';
import { liveMatchOutbox } from '@/zustand/liveMatchOutboxStore';

export default function TournamentView() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { groupId } = useGroup();
    const query = useTournament(groupId, id);
    const cancel = useCancelTournament(groupId);
    const nav = useNavigation();
    const navStyles = useNavStyles();
    const qc = useQueryClient();
    const t = useNextTokens();
    const insets = useInsets(true);
    const androidMenuIcon = useAndroidIcon('dots-vertical', t.text);
    const tournament = query.data;
    const openMatch = (fixture: TournamentFixture, stage: TournamentStage) => {
        if (!tournament || !groupId) return;
        if (fixture.resultMatchId) {
            nav.navigate('match', {
                id: fixture.resultMatchId,
                seasonId: tournament.seasonId,
            });
            return;
        }
        if (
            fixture.status === 'IN_PROGRESS' ||
            liveMatchOutbox().entries[fixture.id]
        ) {
            nav.navigate('liveMatch', { id: fixture.id });
            return;
        }
        if (
            fixture.status !== 'READY' ||
            tournament.status !== 'ACTIVE' ||
            !fixture.blueTeamId ||
            !fixture.redTeamId
        )
            return;
        const blue = tournament.teams.find(
            (team) => team.id === fixture.blueTeamId
        );
        const red = tournament.teams.find(
            (team) => team.id === fixture.redTeamId
        );
        if (!blue || !red) return;
        // An abandoned game's terminal cache must not hide the newly queued replay.
        qc.removeQueries({
            queryKey: liveMatchKey(groupId, fixture.id),
            exact: true,
        });
        const matchId = startLiveMatch({
            id: fixture.id,
            groupId,
            seasonId: tournament.seasonId,
            bluePlayerIds: blue.playerIds,
            redPlayerIds: red.playerIds,
            tournamentId: tournament.id,
            tournamentStage: stage.name,
        });
        nav.navigate('liveMatch', { id: matchId });
    };
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: t.isLight ? '#F5F3FF' : '#100B1C',
            }}
        >
            <Stack.Screen
                options={{
                    ...navStyles,
                    title: tournament?.name ?? 'Tournament',
                }}
            />
            {tournament?.status === 'ACTIVE' && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Menu
                        icon={
                            Platform.OS === 'ios' ? 'ellipsis' : androidMenuIcon
                        }
                        accessibilityLabel="Tournament options"
                    >
                        <Stack.Toolbar.MenuAction
                            icon="trash"
                            destructive
                            onPress={() =>
                                Alert.alert(
                                    'Cancel tournament?',
                                    'Played games stay in your match history. Finish or discard running games first.',
                                    [
                                        {
                                            text: 'Keep playing',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Cancel tournament',
                                            style: 'destructive',
                                            onPress: () => cancel.mutate(id),
                                        },
                                    ]
                                )
                            }
                        >
                            Cancel tournament
                        </Stack.Toolbar.MenuAction>
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar>
            )}
            <View
                style={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    flex: 1,
                }}
            >
                {tournament ? (
                    <>
                        <View
                            style={{
                                padding: 16,
                                flexDirection: 'row',
                                gap: 10,
                                alignItems: 'center',
                            }}
                        >
                            <Icon
                                name={TOURNAMENT_ICON}
                                color={TOURNAMENT_COLOR}
                                size={28}
                            />
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        color: t.text,
                                        fontSize: 17,
                                        fontWeight: '800',
                                    }}
                                >
                                    {tournament.status === 'FINISHED'
                                        ? `Winner: ${tournament.teams.find((team) => team.id === tournament.winnerTeamId)?.name ?? '—'}`
                                        : tournament.status === 'CANCELLED'
                                          ? 'Tournament cancelled'
                                          : `${tournament.teams.length} teams · ${tournament.teamSize} per team`}
                                </Text>
                                <Text
                                    style={{
                                        color: t.textSecondary,
                                        fontSize: 12,
                                        marginTop: 4,
                                    }}
                                >
                                    {tournament.name}
                                </Text>
                            </View>
                        </View>
                        <BracketCanvas
                            stages={tournament.stages}
                            teams={tournament.teams}
                            onMatch={openMatch}
                            canStart={tournament.status === 'ACTIVE'}
                        />
                        {tournament.stages.some(
                            (s) =>
                                s.strategy === 'ROUND_ROBIN' &&
                                s.teamIds.length > 0
                        ) && (
                            <ScrollView
                                style={{ maxHeight: 190 }}
                                contentContainerStyle={{ padding: 16, gap: 6 }}
                            >
                                {tournament.stages
                                    .filter(
                                        (s) =>
                                            s.strategy === 'ROUND_ROBIN' &&
                                            s.teamIds.length > 0
                                    )
                                    .map((stage, index) => (
                                        <View key={index} style={{ gap: 6 }}>
                                            <Text
                                                style={{
                                                    color: TOURNAMENT_COLOR,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                {stage.name} · Standings
                                            </Text>
                                            {standings(stage).map((row, i) => (
                                                <Text
                                                    key={row.teamId}
                                                    style={{
                                                        color: t.text,
                                                        fontVariant: [
                                                            'tabular-nums',
                                                        ],
                                                    }}
                                                >
                                                    {i + 1}.{' '}
                                                    {
                                                        tournament.teams.find(
                                                            (team) =>
                                                                team.id ===
                                                                row.teamId
                                                        )?.name
                                                    }{' '}
                                                    · {row.wins} wins ·{' '}
                                                    {row.scored - row.conceded >
                                                    0
                                                        ? '+'
                                                        : ''}
                                                    {row.scored - row.conceded}{' '}
                                                    points
                                                </Text>
                                            ))}
                                        </View>
                                    ))}
                            </ScrollView>
                        )}
                    </>
                ) : (
                    <View style={{ padding: 24, gap: 12 }}>
                        <Text style={{ color: t.text }}>
                            {query.isError
                                ? 'Couldn’t load this tournament.'
                                : 'Loading tournament…'}
                        </Text>
                        {query.isError && (
                            <Pressable
                                onPress={() => void query.refetch()}
                                style={{ minHeight: 44 }}
                            >
                                <Text style={{ color: TOURNAMENT_COLOR }}>
                                    Retry
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}
