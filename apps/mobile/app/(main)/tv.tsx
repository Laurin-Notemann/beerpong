import { MenuView } from '@expo/ui/community/menu';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import {
    Tv,
    TvMatch,
    useCameras,
    useTvMatches,
    useTvRemote,
    useTvs,
} from '@/api/calls/tvHooks';
import { Icon } from '@/components/Icon';
import IconHead from '@/components/IconHead';
import { CameraControls } from '@/components/tvRemote/CameraControls';
import { CameraLayoutControls } from '@/components/tvRemote/CameraLayoutControls';
import {
    Card,
    MatchSummary,
    PinMark,
    Radio,
    Row,
    scopeLabel,
    scopes,
    screenLabel,
    screens,
    Section,
    Segmented,
    useRemoteTokens,
    versus,
} from '@/components/tvRemote/RemoteParts';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import {
    byStart,
    cameraSubjectLabel,
    parseConfig,
    MAX_MATCHES,
    pickMatches,
    Screen,
    screenOf,
} from '@/lib/tvDisplay';
import { useInsets } from '@/lib/useInsets';

/** The remote for one Versus TV, opened from the TV Remote list. */
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
                    paddingTop: insets.top + 20,
                    paddingBottom: insets.bottom + 32,
                    paddingHorizontal: 16,
                    gap: 32,
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
    const config = parseConfig(tv.config);
    const send = update.mutate;
    const cameras = useCameras(groupId).data ?? [];
    // Match the server's selected device and replacement-subject fallback.
    const mainCameras = cameras.filter(
        (c) => !config.cameraCorners.some((slot) => slot.cameraId === c.id)
    );
    const camera =
        mainCameras.find((i) => i.id === config.cameraId) ??
        mainCameras.find(
            (i) => parseConfig(i.config).cameraSubject === config.cameraSubject
        ) ??
        mainCameras[0];

    // in the order they started, so rows don't move under your thumb while cups are hit
    const live = [...recent].sort(byStart);
    const liveIds = live.map((i) => i.id);
    // Auto and Camera use the first selected live match.
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
        auto: live.length
            ? camera
                ? 'Camera feed · live score'
                : 'One live match on the whole screen'
            : 'Leaderboard, no match running',
        leaderboard: scopeLabel(config.scope),
        live: running,
        camera: camera
            ? `Video from ${camera.name}, even while idle`
            : 'No camera on · waiting for a camera',
        focus:
            screen === 'focus' && picked.length
                ? versus(
                      live.find((i) => i.id === config.focusMatchId) ??
                          picked[0]
                  )
                : running,
    };

    const season = seasons.find((i) => i.id === config.seasonId);

    const confirmRemove = () =>
        Alert.alert(
            'Remove Group from TV',
            'The TV shows its code again. Add it here to put the group back on.',
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
        );

    return (
        <>
            <Section title="On the TV">
                <Card>
                    {screens.map((s) => (
                        <Row
                            key={s.value}
                            icon={s.icon}
                            title={s.label}
                            subtitle={captions[s.value]}
                            selected={screen === s.value}
                            // one match on the whole screen needs a live match
                            disabled={s.value === 'focus' && !live.length}
                            onPress={() => choose(s.value)}
                            trailing={<Radio on={screen === s.value} />}
                        />
                    ))}
                </Card>
            </Section>

            {(screen === 'camera' || screen === 'auto') && (
                <Section
                    title="Camera"
                    footer={
                        cameras.length
                            ? undefined
                            : 'No camera is on. Until one is, the TV shows what Auto shows. Add one under TV Remote → Cameras.'
                    }
                >
                    <Card>
                        <Row
                            icon="swap-horizontal"
                            title="Flip scoreboard sides"
                            subtitle={
                                config.cameraOverlayFlipped
                                    ? 'Red left · Blue right'
                                    : 'Blue left · Red right'
                            }
                            selected={config.cameraOverlayFlipped}
                            onPress={() =>
                                send({
                                    cameraOverlayFlipped:
                                        !config.cameraOverlayFlipped,
                                })
                            }
                            trailing={
                                <Radio on={config.cameraOverlayFlipped} />
                            }
                        />
                    </Card>
                    <CameraLayoutControls
                        config={config}
                        cameras={cameras}
                        send={send}
                    />
                    {config.cameraMainEnabled && cameras.length > 0 && (
                        <Card>
                            {cameras.map((c) => (
                                <Row
                                    key={c.id}
                                    icon="video-outline"
                                    title={c.name}
                                    subtitle={
                                        cameraSubjectLabel[
                                            parseConfig(c.config).cameraSubject
                                        ]
                                    }
                                    selected={camera?.id === c.id}
                                    onPress={() =>
                                        send({
                                            cameraId: c.id,
                                            cameraCorners:
                                                config.cameraCorners.filter(
                                                    (slot) =>
                                                        slot.cameraId !== c.id
                                                ),
                                            cameraSubject: parseConfig(c.config)
                                                .cameraSubject,
                                        })
                                    }
                                    trailing={
                                        <Radio on={camera?.id === c.id} />
                                    }
                                />
                            ))}
                        </Card>
                    )}
                    {config.cameraMainEnabled && camera && (
                        <CameraControls groupId={groupId} camera={camera} />
                    )}
                </Section>
            )}

            {(screen === 'auto' || screen === 'camera') && (
                <Section
                    title="Live match"
                    footer={
                        live.length
                            ? undefined
                            : screen === 'camera'
                              ? 'The camera stays on while idle. The next match adds its score.'
                              : 'Auto shows the leaderboard while idle, then the camera or one live match when a match starts.'
                    }
                >
                    {live.length > 0 && (
                        <Card>
                            <Row
                                title="Automatic"
                                subtitle={
                                    pinned.length || !picked[0]
                                        ? 'One of the latest'
                                        : `Now ${versus(picked[0])}`
                                }
                                selected={!pinned.length}
                                onPress={() => send({ pinnedMatchIds: [] })}
                                trailing={<Radio on={!pinned.length} />}
                            />
                            {live.map((m) => (
                                <Row
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
                                    trailing={<Radio on={pinned[0] === m.id} />}
                                >
                                    <MatchSummary match={m} />
                                </Row>
                            ))}
                        </Card>
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
                            style={{ alignSelf: 'stretch' }}
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
                            <View pointerEvents="none">
                                <Card>
                                    <Row
                                        title="Season"
                                        haptic={false}
                                        trailing={
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                }}
                                            >
                                                <Text
                                                    numberOfLines={1}
                                                    style={{
                                                        color: t.textSecondary,
                                                        fontSize: 17,
                                                    }}
                                                >
                                                    {season?.name ?? 'Current'}
                                                </Text>
                                                <Icon
                                                    name="unfold-more-horizontal"
                                                    size={18}
                                                    color={t.textSecondary}
                                                />
                                            </View>
                                        }
                                    />
                                </Card>
                            </View>
                        </MenuView>
                    )}
                </Section>
            )}

            {screen === 'live' && (
                <Section
                    title="Matches on the TV"
                    footer={
                        live.length
                            ? `Pick up to ${MAX_MATCHES}, in the order they show. Open spots fill up with the latest.`
                            : 'No live matches. They show up here when someone starts one.'
                    }
                >
                    {live.length > 0 && (
                        <Card>
                            {live.map((m) => {
                                const index = pinned.indexOf(m.id);
                                return (
                                    <Row
                                        key={m.id}
                                        selected={index >= 0}
                                        onPress={() => togglePin(m.id)}
                                        trailing={<PinMark index={index} />}
                                    >
                                        <MatchSummary
                                            match={m}
                                            onTv={picked.some(
                                                (i) => i.id === m.id
                                            )}
                                        />
                                    </Row>
                                );
                            })}
                        </Card>
                    )}
                </Section>
            )}

            {screen === 'focus' && (
                <Section
                    title="On the whole screen"
                    footer={`When it ends, the TV goes back to ${screenLabel(config.view)}.`}
                >
                    <Card>
                        {live.map((m) => (
                            <Row
                                key={m.id}
                                selected={config.focusMatchId === m.id}
                                onPress={() => send({ focusMatchId: m.id })}
                                trailing={
                                    <Radio on={config.focusMatchId === m.id} />
                                }
                            >
                                <MatchSummary match={m} />
                            </Row>
                        ))}
                    </Card>
                </Section>
            )}

            <Section
                title="TV"
                footer="Reloading gets the TV the newest version after an update."
            >
                <Card>
                    <Row
                        icon="refresh"
                        title="Reload TV"
                        haptic={false}
                        disabled={reload.isPending}
                        onPress={() => reload.mutate()}
                        trailing={
                            reload.isPending ? <ActivityIndicator /> : undefined
                        }
                    />
                    <Row
                        icon="television-off"
                        title="Remove Group from TV"
                        danger
                        haptic={false}
                        disabled={removeGroup.isPending}
                        onPress={confirmRemove}
                    />
                </Card>
            </Section>
        </>
    );
}
