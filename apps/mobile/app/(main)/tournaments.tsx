import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import { useTournaments } from '@/api/calls/tournamentHooks';
import { usePullToRefresh } from '@/api/utils/reactQuery';
import { Icon } from '@/components/Icon';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { useNextTokens } from '@/components/next/tokens';
import { RefreshControl } from '@/components/RefreshControl';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { TOURNAMENT_COLOR, TOURNAMENT_ICON } from '@/lib/tournament';
import { useInsets } from '@/lib/useInsets';

export default function Tournaments() {
    const { groupId } = useGroup();
    const query = useTournaments(groupId);
    const nav = useNavigation();
    const navStyles = useNavStyles();
    const t = useNextTokens();
    const insets = useInsets(true);
    const refresh = usePullToRefresh(() => query.refetch());
    const active = query.data?.find((t) => t.status === 'ACTIVE');
    return (
        <View style={{ flex: 1, backgroundColor: t.surface }}>
            <Stack.Screen options={{ ...navStyles, title: 'Tournaments' }} />
            {!active && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        onPress={() => nav.navigate('createTournament')}
                    >
                        Start
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
            )}
            <ScrollView
                refreshControl={<RefreshControl {...refresh} />}
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 20,
                    paddingHorizontal: 16,
                    gap: 16,
                }}
            >
                {query.isError && (
                    <Text style={{ color: t.text }}>
                        Couldn’t load tournaments. Pull to retry.
                    </Text>
                )}
                {active && (
                    <MenuSection title="Active tournament">
                        <MenuItem
                            title={active.name}
                            subtitle={`${active.teams.length} teams · ${active.stages.length} stages`}
                            headIcon={
                                <Icon
                                    name={TOURNAMENT_ICON}
                                    size={24}
                                    color={TOURNAMENT_COLOR}
                                />
                            }
                            tailIconType="next"
                            onPress={() =>
                                nav.navigate('tournament', { id: active.id })
                            }
                        />
                    </MenuSection>
                )}
                <MenuSection title="Past tournaments">
                    {query.data
                        ?.filter((t) => t.status !== 'ACTIVE')
                        .map((tournament) => (
                            <MenuItem
                                key={tournament.id}
                                title={tournament.name}
                                subtitle={
                                    tournament.status === 'CANCELLED'
                                        ? 'Cancelled'
                                        : `Winner: ${tournament.teams.find((team) => team.id === tournament.winnerTeamId)?.name ?? '—'}`
                                }
                                headIcon={
                                    <Icon
                                        name={TOURNAMENT_ICON}
                                        size={24}
                                        color={TOURNAMENT_COLOR}
                                    />
                                }
                                tailIconType="next"
                                onPress={() =>
                                    nav.navigate('tournament', {
                                        id: tournament.id,
                                    })
                                }
                            />
                        ))}
                </MenuSection>
                {!query.isLoading && !query.data?.length && (
                    <Text style={{ color: t.textSecondary }}>
                        Start your first tournament with the Start button.
                        Completed tournaments stay here.
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}
