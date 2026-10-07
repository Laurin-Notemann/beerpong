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
import { assetIdOf } from '@/api/utils/assetId';
import { useApi } from '@/api/utils/create-api';
import { namedMoveLog } from '@/lib/liveMatch/labels';
import { toTeamCreateDtos } from '@/lib/liveMatch/log';
import { rackCode } from '@/lib/liveMatch/rackCode';
import { useActivityAvatars } from '@/lib/widgets/activityAvatars';
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
    players: {
        id: string;
        name: string;
        team: 'red' | 'blue';
        /** the avatar's asset id, for the Live Activity's and the widget's copy of it */
        avatar?: string;
    }[];
    moves: WidgetMove[];
    /** each team's cups as they're drawn, for the Live Activity and the widget (rackCode) */
    blueCups: string;
    redCups: string;
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
                return {
                    id: i.id,
                    startedAt: i.startedAt,
                    seq: i.syncedSeq,
                    score: toLiveScore(teams),
                    teams: toTeamCreateDtos(i.state),
                    players: people.map(({ id, name, team, avatarUrl }) => ({
                        id,
                        name,
                        team,
                        avatar: assetIdOf(avatarUrl) || undefined,
                    })),
                    blueCups: rackCode(i.state, 'blue'),
                    redCups: rackCode(i.state, 'red'),
                    moves: namedMoveLog(i.state.cupHits, moves, people)
                        .slice(0, REPORTED_MOVES)
                        .map((m) => ({
                            name: m.name,
                            team: m.team,
                            move: m.move,
                            score: `${m.blue}–${m.red}`,
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
        for (const {
            id,
            seq,
            score,
            teams,
            players,
            moves,
            blueCups,
            redCups,
        } of scores) {
            if (seq === undefined) continue;
            const body = {
                seq,
                ...score,
                teams,
                players,
                moves,
                blueCups,
                redCups,
            };
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
    leaderboardWidget?.updateSnapshot(
        JSON.parse(json) as LeaderboardWidgetProps
    );
    writtenLeaderboard = json;
};
const writeLiveMatches = (json: string) => {
    writtenLiveMatches = json;
    const parsed = JSON.parse(json) as LiveMatchesWidgetProps;
    const next = {
        ...parsed,
        matches: parsed.matches.map((match) => ({
            ...match,
            // Missing dates use the write time, outside render.
            startedAt: match.startedAt || Date.now(),
        })),
    };
    liveMatchesWidget
        ?.getTimeline()
        .then((timeline) =>
            showLiveMatches(mergeLiveMatches(next, timeline[0]?.props))
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
    // every player of the season, so their avatar is there when a match starts
    useActivityAvatars(
        usePlayersQuery(groupId, seasonId).data?.data?.map(
            (i) => i.profile?.avatarUrl
        ) ?? []
    );

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
            groupId,
            matches: scores.map((i) => ({
                id: i.id,
                startedAt: Date.parse(i.startedAt) || 0,
                ...i.score,
                players: i.players.map(({ name, team, avatar }) => ({
                    name,
                    team,
                    avatar,
                })),
                moves: i.moves,
                blueCups: i.blueCups,
                redCups: i.redCups,
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

/** how long to wait for the push-to-start token; iOS has none while Live Activities are off in its Settings */
const START_TOKEN_WAIT_MS = 10_000;

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
    // undefined until iOS gives it: sending null makes the API forget it, and a phone launched
    // (also in the background, by a widget push) as a match starts would miss its Live Activity
    const [startToken, setStartToken] = useState<string | null>();
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
        const timeout = setTimeout(
            () => setStartToken((token) => token ?? null),
            START_TOKEN_WAIT_MS
        );
        return () => {
            sub.remove();
            clearTimeout(timeout);
        };
    }, [liveActivities]);

    const activityStartToken =
        supportsLiveActivities && liveActivities ? startToken : null;
    useEffect(() => {
        // wait for both tokens, or for knowing there is none
        if (deviceToken === undefined || activityStartToken === undefined) {
            return;
        }
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
