import * as Notifications from 'expo-notifications';
import { addPushToStartTokenListener } from 'expo-widgets';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { toPlayer, useGroup } from '@/api/calls/seasonHooks';
import {
    liveMatchTeams,
    useGroupLiveMatches,
} from '@/api/liveMatch/useGroupLiveMatches';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { moveLog } from '@/lib/liveMatch/labels';
import { toTeamCreateDtos } from '@/lib/liveMatch/log';
import { leaderboardWidget } from '@/lib/widgets/LeaderboardWidget';
import {
    liveMatchesWidget,
    showLiveMatches,
} from '@/lib/widgets/LiveMatchesWidget';
import {
    emptyLeaderboardWidget,
    type LeaderboardWidgetProps,
    type LiveMatchesWidgetProps,
    type LiveScore,
    mergeLiveMatches,
    toLeaderboardWidget,
    toLiveScore,
    type WidgetMove,
} from '@/lib/widgets/props';
import type { Components } from '@/openapi/openapi';
import { ScopedLogger } from '@/utils/logging';
import { useSelectedGroupHydrated } from '@/zustand/group/stateGroupStore';
import { useLocalSettingsStore } from '@/zustand/localSettingsStore';

const logger = new ScopedLogger('widgets');

interface LiveScoreOf {
    id: string;
    startedAt: string;
    /** the seq the score is at; undefined while this phone isn't in sync with the server */
    seq?: number;
    score: LiveScore;
    /** for the "Live matches" widget: the API computes the players' live Elo from the teams */
    teams: Components.Schemas.TeamCreateDto[];
    players: { id: string; name: string; team: 'red' | 'blue' }[];
    moves: WidgetMove[];
}

/** the most moves a report carries (the API takes 10, the widget shows fewer) */
const REPORTED_MOVES = 10;

/**
 * The group's live matches of the active season with their scores as this phone computes them,
 * once the season's players and rules are loaded.
 */
function useLiveScores(groupId: ApiId | null, seasonId: ApiId | null) {
    const { matches } = useGroupLiveMatches(groupId);
    const players = usePlayersQuery(groupId, seasonId).data?.data;
    const moves = useMoves(groupId, seasonId).data?.data;

    return useMemo<LiveScoreOf[]>(() => {
        if (!players || !moves) return [];
        return matches
            .filter((i) => i.seasonId === seasonId)
            .map((i) => {
                const teams = liveMatchTeams(i.state, players, moves);
                const people = [
                    ...teams.blue.players.map((p) => ({
                        ...p,
                        team: 'blue' as const,
                    })),
                    ...teams.red.players.map((p) => ({
                        ...p,
                        team: 'red' as const,
                    })),
                ];
                const nameOf = (id: string) =>
                    people.find((p) => p.id === id)?.name ?? '';
                return {
                    id: i.id,
                    startedAt: i.startedAt,
                    seq: i.syncedSeq,
                    score: toLiveScore(teams),
                    teams: toTeamCreateDtos(i.state),
                    players: people.map(({ id, name, team }) => ({
                        id,
                        name,
                        team,
                    })),
                    moves: moveLog(i.state.cupHits, moves)
                        .slice(0, REPORTED_MOVES)
                        .map((m) => ({
                            name: nameOf(m.playerId),
                            team: m.team,
                            move: m.move,
                        })),
                };
            });
    }, [matches, players, moves, seasonId]);
}

/** by live match: what this phone reported last */
const reported = new Map<string, string>();

/**
 * Reports the scores to the API, which pushes them to the group's Live Activities and widgets.
 * Every phone in sync with the server reports; the API keeps one per seq.
 */
function useLiveScoreReports(groupId: ApiId | null, scores: LiveScoreOf[]) {
    const { api } = useApi();

    useEffect(() => {
        if (!groupId) return;
        for (const { id, seq, score, teams, players, moves } of scores) {
            if (seq === undefined) continue;
            const body = { seq, ...score, teams, players, moves };
            const key = JSON.stringify(body);
            if (reported.get(id) === key) continue;
            reported.set(id, key);
            api.then((client) =>
                client.setLiveMatchDisplay({ groupId, id }, body)
            ).catch((err) => {
                // the next change, or the next time this phone is in sync, tries again
                reported.delete(id);
                logger.warn('failed to report a live score', id, err);
            });
        }
    }, [api, groupId, scores]);
}

let writtenLeaderboard: string | undefined;
let writtenLiveMatches: string | undefined;

/** writes props to a widget if they changed: reloading a widget is cheap, but not free */
function useWidgetProps(
    props: object | undefined,
    written: () => string | undefined,
    write: (json: string) => void
) {
    const json = props ? JSON.stringify(props) : undefined;
    useEffect(() => {
        if (!json || json === written()) return;
        try {
            write(json);
        } catch (err) {
            logger.error('failed to update a widget', err);
        }
    }, [json, written, write]);
}

const writeLeaderboard = (json: string) => {
    leaderboardWidget?.updateSnapshot(JSON.parse(json));
    writtenLeaderboard = json;
};
const writeLiveMatches = (json: string) => {
    writtenLiveMatches = json;
    const next = JSON.parse(json) as LiveMatchesWidgetProps;
    liveMatchesWidget
        ?.getTimeline()
        .then((timeline) =>
            showLiveMatches(
                mergeLiveMatches(
                    next,
                    timeline[0]?.props as LiveMatchesWidgetProps | undefined
                )
            )
        )
        .catch((err) => {
            writtenLiveMatches = undefined;
            logger.error('failed to update the live matches widget', err);
        });
};

/**
 * Reports this phone's live scores, and keeps both home screen widgets on the selected group:
 * "Leaderboard" on its season leaderboard, "Live matches" on its matches running now. While the
 * app isn't running, the API's silent pushes update the live matches (`liveScoresTask`).
 */
export function useHomeScreenWidgets() {
    const hydrated = useSelectedGroupHydrated();
    const { groupId, seasonId, group, activeSeason } = useGroup();
    const query = useGetLeaderboardQuery(
        leaderboardWidget ? groupId : null,
        seasonId,
        LeaderboardScope.SEASON
    );
    const entries = query.data?.data?.entries;
    const scores = useLiveScores(groupId, seasonId ?? null);
    useLiveScoreReports(groupId, scores);

    const props = useMemo<LeaderboardWidgetProps | undefined>(() => {
        if (!groupId) return emptyLeaderboardWidget;
        // keep what it shows while the group or its leaderboard loads
        if (!group?.data?.name || !activeSeason || !entries) return;

        return toLeaderboardWidget({
            group: group.data.name,
            season: activeSeason.name ?? '',
            players: entries.map(toPlayer),
            rankingAlgorithm: activeSeason.seasonSettings?.rankingAlgorithm,
            minMatchesToQualify:
                activeSeason.seasonSettings?.minMatchesToQualify ?? 0,
        });
    }, [groupId, group, activeSeason, entries]);

    const liveProps = useMemo<LiveMatchesWidgetProps | undefined>(() => {
        if (!groupId) return { group: '', matches: [] };
        if (!group?.data?.name) return;

        return {
            group: group.data.name,
            matches: scores.map((i) => ({
                id: i.id,
                startedAt: Date.parse(i.startedAt) || Date.now(),
                ...i.score,
                players: i.players.map(({ name, team }) => ({ name, team })),
                moves: i.moves,
            })),
        };
    }, [groupId, group, scores]);

    useWidgetProps(
        hydrated && leaderboardWidget ? props : undefined,
        () => writtenLeaderboard,
        writeLeaderboard
    );
    useWidgetProps(
        hydrated && liveMatchesWidget ? liveProps : undefined,
        () => writtenLiveMatches,
        writeLiveMatches
    );
}

// Live Activities follow a broadcast channel per live match, which needs iOS 18
const supportsLiveActivities =
    Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 18;

let sentTokens: string | undefined;

/**
 * Gives the API this phone's push tokens: the device token for the widget's silent pushes, and
 * (with Live Activities on in Settings) the push-to-start token that starts the group's live
 * matches on the Lock Screen.
 */
export function usePushTokens() {
    const { api } = useApi();
    const liveActivities = useLocalSettingsStore((s) => s.liveActivities);
    const [deviceToken, setDeviceToken] = useState<string | null>();
    const [startToken, setStartToken] = useState<string | null>(null);
    // a failed send is retried the next time the app comes to the foreground
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;
        Notifications.getDevicePushTokenAsync()
            .then((token) => setDeviceToken(String(token.data)))
            .catch((err) => {
                logger.warn('no device push token', err);
                setDeviceToken(null);
            });
        const sub = Notifications.addPushTokenListener((token) =>
            setDeviceToken(String(token.data))
        );
        const appState = AppState.addEventListener('change', (state) => {
            if (state === 'active') setAttempt((i) => i + 1);
        });
        return () => {
            sub.remove();
            appState.remove();
        };
    }, []);

    useEffect(() => {
        if (!supportsLiveActivities || !liveActivities) return;
        const sub = addPushToStartTokenListener((event) =>
            setStartToken(event.activityPushToStartToken)
        );
        return () => sub.remove();
    }, [liveActivities]);

    const activityStartToken = liveActivities ? startToken : null;
    useEffect(() => {
        // wait for the device token, or for knowing there is none
        if (deviceToken === undefined) return;
        const body = { deviceToken, activityStartToken };
        const json = JSON.stringify(body);
        if (json === sentTokens) return;
        sentTokens = json;
        api.then((client) => client.setPushTokens(null, body)).catch((err) => {
            sentTokens = undefined;
            logger.warn('failed to send the push tokens', err);
        });
    }, [api, deviceToken, activityStartToken, attempt]);
}
