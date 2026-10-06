import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { Tv, useTvRemote, useTvs } from '@/api/calls/tvHooks';
import { env } from '@/api/env';
import {
    LiveMatchTeam,
    liveMatchTeams,
    useGroupLiveMatches,
} from '@/api/liveMatch/useGroupLiveMatches';
import IconHead from '@/components/IconHead';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import {
    byStart,
    DisplayConfig,
    layoutFor,
    MAX_MATCHES,
    pickMatches,
    Scope,
    type View as TvView,
} from '@/lib/tvDisplay';
import { useInsets } from '@/lib/useInsets';

/** what the TV shows: one of the views, or a live match on the whole screen */
type Screen = TvView | 'focus';

const screens: { value: Screen; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'leaderboard', label: 'Leaderboard' },
    { value: 'live', label: 'Live' },
    { value: 'focus', label: 'One Match' },
];

const scopes: { value: Scope; label: string }[] = [
    { value: 'season', label: 'This Season' },
    { value: 'today', label: 'Today' },
    { value: 'all-time', label: 'All Time' },
];

interface Match {
    id: string;
    startedAt: string;
    blue: LiveMatchTeam;
    red: LiveMatchTeam;
}

const names = (team: LiveMatchTeam) =>
    team.players.map((p) => p.name).join(' & ') || '…';
const versus = (match: Match) => `${names(match.blue)} vs ${names(match.red)}`;
const score = (match: Match) => `${match.blue.score} – ${match.red.score}`;

const screenOf = (config: DisplayConfig, liveIds: string[]): Screen =>
    layoutFor(config, liveIds) === 'focus' ? 'focus' : config.view;

/**
 * The remote for the Versus TVs that show the group, with what the web remote (apps/web,
 * `/tv/remote`) can do. Putting a group on a TV still goes through its QR code.
 */
export default function Page() {
    const insets = useInsets();
    const { groupId, seasonId, group } = useGroup();
    const tvsQuery = useTvs(groupId);
    const tvs = tvsQuery.data ?? [];
    const [selectedId, setSelectedId] = useState<string>();
    // the first one, until another is picked or the picked one goes off
    const tv = tvs.find((i) => i.id === selectedId) ?? tvs[0];

    // live matches are always in the active season; the TV only knows those on the server
    const players = usePlayersQuery(groupId, seasonId ?? null).data?.data;
    const moves = useMoves(groupId, seasonId ?? null).data?.data;
    const { matches } = useGroupLiveMatches(groupId);
    const recent: Match[] = matches
        .filter((i) => !i.isPendingCreate)
        .map((i) => ({
            id: i.id,
            startedAt: i.startedAt,
            ...liveMatchTeams(i.state, players, moves),
        }));
    const liveIds = recent.map((i) => i.id);
    const pastSeasons = (useAllSeasonsQuery(groupId).data?.data ?? []).filter(
        (i) => i.id !== group?.data?.activeSeasonId
    );

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'TV Remote' }} />
            <InputModal>
                <ScrollView
                    style={{ marginHorizontal: -16 }}
                    contentContainerStyle={{
                        gap: 32,
                        paddingHorizontal: 16,
                        paddingBottom: insets.bottom + 16,
                    }}
                >
                    {tvsQuery.isLoading ? (
                        <ActivityIndicator style={{ paddingTop: 64 }} />
                    ) : !tv ? (
                        <IconHead
                            style={{ paddingTop: 64 }}
                            iconName="television-off"
                            title={
                                tvsQuery.error
                                    ? 'Couldn’t reach Versus TV'
                                    : `No TV shows ${group?.data?.name ?? 'your group'}`
                            }
                            description={`Open ${env.tvBaseUrl.replace(/^https?:\/\//, '')}/tv on a TV, scan its code and enter your group code. It shows up here while it's on.`}
                        />
                    ) : (
                        <>
                            {tvs.length > 1 && (
                                <Select
                                    noFlex
                                    title="TVs"
                                    value={tv.id}
                                    onChange={setSelectedId}
                                    items={tvs.map((i, idx) => ({
                                        value: i.id,
                                        title: `TV ${idx + 1}`,
                                        subtitle: screens.find(
                                            (s) =>
                                                s.value ===
                                                screenOf(i.config, liveIds)
                                        )?.label,
                                    }))}
                                />
                            )}
                            <Remote
                                key={tv.id}
                                groupId={groupId}
                                tv={tv}
                                recent={recent}
                                pastSeasons={pastSeasons}
                            />
                        </>
                    )}
                </ScrollView>
            </InputModal>
        </>
    );
}

function Remote({
    groupId,
    tv,
    recent,
    pastSeasons,
}: {
    groupId: string | null;
    tv: Tv;
    /** the live matches, most recently active first */
    recent: Match[];
    pastSeasons: { id: string; name: string | null }[];
}) {
    const { update, reload, removeGroup } = useTvRemote(groupId, tv.id);
    const { config } = tv;
    const send = update.mutate;

    // in the order they started, so rows don't move under your thumb while cups are hit
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
        auto: live.length
            ? 'Leaderboard + a live match'
            : 'Leaderboard, no match running',
        leaderboard: scopes.find((i) => i.value === config.scope)?.label ?? '',
        live: running,
        focus:
            screen === 'focus' && picked.length
                ? versus(
                      live.find((i) => i.id === config.focusMatchId) ??
                          picked[0]
                  )
                : running,
    };

    return (
        <>
            <Select
                noFlex
                title="Screen"
                value={screen}
                onChange={(value) => choose(value as Screen)}
                // one match on the whole screen needs a live match
                items={screens
                    .filter((s) => s.value !== 'focus' || live.length)
                    .map((s) => ({
                        value: s.value,
                        title: s.label,
                        subtitle: captions[s.value],
                    }))}
            />

            {screen === 'auto' && (
                <Select
                    noFlex
                    title="Next to the Leaderboard"
                    footer={
                        live.length
                            ? undefined
                            : 'When someone starts a match, it shows next to the leaderboard.'
                    }
                    value={pinned[0] ?? ''}
                    onChange={(value) =>
                        send({
                            pinnedMatchIds: value
                                ? [value, ...pinned.filter((i) => i !== value)]
                                : [],
                        })
                    }
                    items={[
                        {
                            value: '',
                            title: 'Automatic',
                            subtitle: pinned.length
                                ? 'One of the latest'
                                : picked[0]
                                  ? `Now ${versus(picked[0])}`
                                  : 'The latest',
                        },
                        ...live.map((m) => ({
                            value: m.id,
                            title: versus(m),
                            subtitle: score(m),
                        })),
                    ]}
                />
            )}

            {(screen === 'auto' || screen === 'leaderboard') && (
                <>
                    <Select
                        noFlex
                        title="Leaderboard"
                        value={config.scope}
                        onChange={(value) => send({ scope: value as Scope })}
                        items={scopes.map((i) => ({
                            value: i.value,
                            title: i.label,
                        }))}
                    />
                    {config.scope !== 'all-time' && pastSeasons.length > 0 && (
                        <Select
                            noFlex
                            title="Season"
                            value={config.seasonId ?? ''}
                            onChange={(value) =>
                                send({ seasonId: value || null })
                            }
                            items={[
                                { value: '', title: 'Current Season' },
                                ...pastSeasons.map((i) => ({
                                    value: i.id,
                                    title: i.name ?? 'Season',
                                })),
                            ]}
                        />
                    )}
                </>
            )}

            {screen === 'live' && (
                <MenuSection
                    noFlex
                    title="Matches on the TV"
                    footer={
                        live.length
                            ? `Pick up to ${MAX_MATCHES}, in the order they show. Open spots fill up with the latest.`
                            : 'No live matches. They show up here when someone starts one.'
                    }
                >
                    {live.map((m, idx) => {
                        const index = pinned.indexOf(m.id);
                        const onTv = picked.some((i) => i.id === m.id);
                        return (
                            <MenuItem
                                key={m.id}
                                border={idx !== 0}
                                title={versus(m)}
                                subtitle={
                                    score(m) + (onTv ? ' · on the TV' : '')
                                }
                                tailContent={
                                    index >= 0 ? String(index + 1) : undefined
                                }
                                tailIconType={
                                    index >= 0 ? 'checked' : 'unchecked'
                                }
                                onPress={() => togglePin(m.id)}
                            />
                        );
                    })}
                </MenuSection>
            )}

            {screen === 'focus' && (
                <Select
                    noFlex
                    title="On the Whole Screen"
                    footer={`When it ends, the TV goes back to ${screens.find((i) => i.value === config.view)?.label}.`}
                    value={config.focusMatchId}
                    onChange={(value) => send({ focusMatchId: value })}
                    items={live.map((m) => ({
                        value: m.id,
                        title: versus(m),
                        subtitle: score(m),
                    }))}
                />
            )}

            <MenuSection
                noFlex
                title="TV"
                footer="Reloading gets the TV the newest version after an update."
            >
                <MenuItem
                    border={false}
                    title="Reload TV"
                    headIcon="refresh"
                    tailContent={
                        reload.isPending ? <ActivityIndicator /> : undefined
                    }
                    onPress={() => reload.mutate()}
                />
                <MenuItem
                    title="Remove Group from TV"
                    headIcon="television-off"
                    type="danger"
                    onPress={() => removeGroup.mutate()}
                    confirmationPrompt={{
                        title: 'Remove Group from TV',
                        description:
                            'The TV goes back to its QR code. Scan it to put the group on again.',
                        buttonText: 'Remove',
                    }}
                />
            </MenuSection>
        </>
    );
}
