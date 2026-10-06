import { MenuView } from '@expo/ui/community/menu';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import {
    Tv,
    TvMatch,
    useTvMatches,
    useTvRemote,
    useTvs,
} from '@/api/calls/tvHooks';
import { Icon } from '@/components/Icon';
import IconHead from '@/components/IconHead';
import {
    Choice,
    Hint,
    MatchSummary,
    PinMark,
    Radio,
    RemoteButton,
    scopeLabel,
    scopes,
    screenLabel,
    screens,
    ScreenTile,
    Section,
    Segmented,
    useRemoteTokens,
    versus,
} from '@/components/tvRemote/RemoteParts';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import {
    byStart,
    MAX_MATCHES,
    pickMatches,
    Screen,
    screenOf,
} from '@/lib/tvDisplay';
import { useInsets } from '@/lib/useInsets';

/** The remote for one Versus TV, opened from the TV Remote list; what the web remote can do. */
export default function Page() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useInsets(true);
    const t = useRemoteTokens();
    const { groupId, seasonId } = useGroup();
    const tvsQuery = useTvs(groupId);
    const tv = tvsQuery.data?.find((i) => i.id === id);
    const recent = useTvMatches(groupId, seasonId ?? null);

    return (
        <>
            <Stack.Screen
                options={{ ...useNavStyles(), headerTitle: tv?.name ?? 'TV' }}
            />
            <ScrollView
                style={{ flex: 1, backgroundColor: t.theme.color.bg }}
                contentContainerStyle={{
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 24,
                    paddingHorizontal: 16,
                    gap: 28,
                }}
            >
                {tv ? (
                    <Remote groupId={groupId} tv={tv} recent={recent} />
                ) : tvsQuery.isLoading ? (
                    <ActivityIndicator style={{ paddingTop: 64 }} />
                ) : (
                    <IconHead
                        style={{ paddingTop: 64, paddingHorizontal: 16 }}
                        iconName="television-off"
                        title="This TV is off"
                        description="Or it shows another group now. It comes back here when it's on again."
                    />
                )}
            </ScrollView>
        </>
    );
}

function Remote({
    groupId,
    tv,
    recent,
}: {
    groupId: string | null;
    tv: Tv;
    /** the live matches, most recently active first */
    recent: TvMatch[];
}) {
    const nav = useNavigation();
    const t = useRemoteTokens();
    const { update, reload, removeGroup } = useTvRemote(groupId, tv.id);
    const { group } = useGroup();
    const seasons = useAllSeasonsQuery(groupId).data?.data ?? [];
    const pastSeasons = seasons.filter(
        (i) => i.id !== group?.data?.activeSeasonId
    );
    const { config } = tv;
    const send = update.mutate;

    // in the order they started, so cards don't move under your thumb while cups are hit
    const live = [...recent].sort(byStart);
    const liveIds = live.map((i) => i.id);
    // the live matches the TV shows (the first one next to the leaderboard)
    const picked = pickMatches(recent, config.pinnedMatchIds);
    const pinned = config.pinnedMatchIds.filter((i) => liveIds.includes(i));
    const screen = screenOf(config, liveIds);

    const choose = (next: Screen) => {
        if (next !== 'focus') send({ view: next, focusMatchId: null });
        // the match the TV shows right now goes on the whole screen
        else if (screen !== 'focus' && picked[0])
            send({ focusMatchId: picked[0].id });
    };

    const togglePin = (matchId: string) =>
        send({
            pinnedMatchIds: pinned.includes(matchId)
                ? pinned.filter((i) => i !== matchId)
                : [...pinned, matchId].slice(-MAX_MATCHES),
        });

    const running = live.length ? `${live.length} running` : 'None running';
    const captions: Record<Screen, string> = {
        auto: live.length ? 'Board + a live match' : 'Board, no match running',
        leaderboard: scopeLabel(config.scope),
        live: running,
        focus:
            screen === 'focus' && picked.length
                ? versus(
                      live.find((i) => i.id === config.focusMatchId) ??
                          picked[0]
                  )
                : running,
    };

    const season = seasons.find((i) => i.id === config.seasonId);

    return (
        <>
            <View style={{ gap: 12 }}>
                {[screens.slice(0, 2), screens.slice(2)].map((row, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                        {row.map((s) => (
                            <ScreenTile
                                key={s.value}
                                screen={s.value}
                                label={s.label}
                                caption={captions[s.value]}
                                selected={screen === s.value}
                                disabled={s.value === 'focus' && !live.length}
                                onPress={() => choose(s.value)}
                            />
                        ))}
                    </View>
                ))}
            </View>

            {screen === 'auto' && (
                <Section title="Next to the leaderboard">
                    {live.length === 0 ? (
                        <Hint>
                            When someone starts a match, it shows here and next
                            to the leaderboard.
                        </Hint>
                    ) : (
                        <View style={{ gap: 8 }}>
                            <Choice
                                selected={!pinned.length}
                                onPress={() => send({ pinnedMatchIds: [] })}
                                mark={<Radio on={!pinned.length} />}
                            >
                                <Text
                                    style={{
                                        color: t.text,
                                        fontSize: 16,
                                        fontWeight: '600',
                                    }}
                                >
                                    Automatic
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: t.textSecondary,
                                        fontSize: 13,
                                    }}
                                >
                                    {pinned.length || !picked[0]
                                        ? 'One of the latest'
                                        : `Now ${versus(picked[0])}`}
                                </Text>
                            </Choice>
                            {live.map((m) => (
                                <Choice
                                    key={m.id}
                                    selected={pinned[0] === m.id}
                                    onPress={() =>
                                        send({
                                            pinnedMatchIds: [
                                                m.id,
                                                ...pinned.filter(
                                                    (i) => i !== m.id
                                                ),
                                            ],
                                        })
                                    }
                                    mark={<Radio on={pinned[0] === m.id} />}
                                >
                                    <MatchSummary match={m} />
                                </Choice>
                            ))}
                        </View>
                    )}
                </Section>
            )}

            {(screen === 'auto' || screen === 'leaderboard') && (
                <Section title="Leaderboard">
                    <Segmented
                        value={config.scope}
                        onChange={(scope) => send({ scope })}
                        options={scopes}
                    />
                    {config.scope !== 'all-time' && pastSeasons.length > 0 && (
                        <MenuView
                            title="Season"
                            actions={[
                                {
                                    id: '',
                                    title: 'Current Season',
                                    state: season ? 'off' : 'on',
                                },
                                ...pastSeasons.map((i) => ({
                                    id: i.id,
                                    title: i.name ?? 'Season',
                                    state:
                                        i.id === season?.id
                                            ? ('on' as const)
                                            : ('off' as const),
                                })),
                            ]}
                            onPressAction={({ nativeEvent }) =>
                                send({ seasonId: nativeEvent.event || null })
                            }
                        >
                            <View
                                pointerEvents="none"
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 13,
                                    paddingHorizontal: 16,
                                    borderRadius: 14,
                                    borderCurve: 'continuous',
                                    borderWidth: 1,
                                    borderColor: t.hairline,
                                    backgroundColor: t.surface,
                                }}
                            >
                                <Text
                                    style={{
                                        flex: 1,
                                        color: t.text,
                                        fontSize: 16,
                                    }}
                                >
                                    {season?.name ?? 'Current Season'}
                                </Text>
                                <Icon
                                    name="unfold-more-horizontal"
                                    size={20}
                                    color={t.textSecondary}
                                />
                            </View>
                        </MenuView>
                    )}
                </Section>
            )}

            {screen === 'live' && (
                <Section title="Matches on the TV">
                    {live.length === 0 ? (
                        <Hint>
                            No live matches. They show up here when someone
                            starts one.
                        </Hint>
                    ) : (
                        <>
                            <Hint>
                                Pick up to {MAX_MATCHES}, in the order they
                                show. Open spots fill up with the latest.
                            </Hint>
                            <View style={{ gap: 8 }}>
                                {live.map((m) => {
                                    const index = pinned.indexOf(m.id);
                                    return (
                                        <Choice
                                            key={m.id}
                                            selected={index >= 0}
                                            onPress={() => togglePin(m.id)}
                                            mark={<PinMark index={index} />}
                                        >
                                            <MatchSummary
                                                match={m}
                                                onTv={picked.some(
                                                    (i) => i.id === m.id
                                                )}
                                            />
                                        </Choice>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </Section>
            )}

            {screen === 'focus' && (
                <Section title="On the whole screen">
                    <View style={{ gap: 8 }}>
                        {live.map((m) => (
                            <Choice
                                key={m.id}
                                selected={config.focusMatchId === m.id}
                                onPress={() => send({ focusMatchId: m.id })}
                                mark={
                                    <Radio on={config.focusMatchId === m.id} />
                                }
                            >
                                <MatchSummary match={m} />
                            </Choice>
                        ))}
                    </View>
                    <Hint>
                        When it ends, the TV goes back to{' '}
                        {screenLabel(config.view)}.
                    </Hint>
                </Section>
            )}

            <Section title="TV">
                <RemoteButton
                    title={reload.isPending ? 'Reloading…' : 'Reload TV'}
                    busy={reload.isPending}
                    onPress={() => reload.mutate()}
                />
                <Hint>
                    Reloads the page on the TV, so it gets the newest version
                    after an update.
                </Hint>
                <RemoteButton
                    danger
                    title="Remove Group from TV"
                    busy={removeGroup.isPending}
                    onPress={() =>
                        Alert.alert(
                            'Remove Group from TV',
                            'The TV goes back to its QR code. Scan it to put the group on again.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () =>
                                        removeGroup.mutate(undefined, {
                                            onSuccess: () => nav.goBack(),
                                        }),
                                },
                            ]
                        )
                    }
                />
            </Section>
        </>
    );
}
