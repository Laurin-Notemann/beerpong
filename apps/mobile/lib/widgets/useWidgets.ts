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
import {
    leaderboardWidget,
    showOnWidget,
} from '@/lib/widgets/LeaderboardWidget';
import {
    emptyLeaderboardWidget,
    type LeaderboardWidgetProps,
    type LiveScore,
    toLeaderboardWidget,
    toLiveScore,
    type WidgetLiveMatch,
} from '@/lib/widgets/props';
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
}

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
            .map((i) => ({
                id: i.id,
                startedAt: i.startedAt,
                seq: i.syncedSeq,
                score: toLiveScore(liveMatchTeams(i.state, players, moves)),
            }));
    }, [matches, players, moves, seasonId]);
}

/** by live match: what this phone reported last, as `${seq} ${score}` */
const reported = new Map<string, string>();

/**
 * Reports the scores to the API, which pushes them to the group's Live Activities and widgets.
 * Every phone in sync with the server reports; the API keeps one per seq.
 */
function useLiveScoreReports(groupId: ApiId | null, scores: LiveScoreOf[]) {
    const { api } = useApi();

    useEffect(() => {
        if (!groupId) return;
        for (const { id, seq, score } of scores) {
            if (seq === undefined) continue;
            const key = `${seq} ${JSON.stringify(score)}`;
            if (reported.get(id) === key) continue;
            reported.set(id, key);
            api.then((client) =>
                client.setLiveMatchDisplay({ groupId, id }, { seq, ...score })
            ).catch((err) => {
                // the next change, or the next time this phone is in sync, tries again
                reported.delete(id);
                logger.warn('failed to report a live score', id, err);
            });
        }
    }, [api, groupId, scores]);
}

let writtenWidget: string | undefined;

/**
 * Reports this phone's live scores, and keeps the home screen widget on the selected group: its
 * matches running now, else its season leaderboard. While the app isn't running, the API's
 * silent pushes update the widget's matches (`liveScoresTask`).
 */
export function useHomeScreenWidget() {
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
            live: scores.map((i): WidgetLiveMatch => ({
                id: i.id,
                startedAt: Date.parse(i.startedAt) || Date.now(),
                ...i.score,
            })),
        });
    }, [groupId, group, activeSeason, entries, scores]);

    const json = hydrated && props ? JSON.stringify(props) : undefined;
    useEffect(() => {
        // reloading a widget is cheap while the app is open, but only reload it on a change
        if (!leaderboardWidget || !json || json === writtenWidget) return;
        try {
            showOnWidget(JSON.parse(json));
            writtenWidget = json;
        } catch (err) {
            logger.error('failed to update the widget', err);
        }
    }, [json]);
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
