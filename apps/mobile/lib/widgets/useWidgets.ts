import { useQueryClient } from '@tanstack/react-query';
import { after, type LiveActivity } from 'expo-widgets';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import { useLiveMatchesQuery } from '@/api/calls/liveMatchHooks';
import { toPlayer, useGroup } from '@/api/calls/seasonHooks';
import { cachedMatch } from '@/api/liveMatch/liveMatchCache';
import {
    useGroupLiveMatches,
    useLiveMatchTeams,
} from '@/api/liveMatch/useGroupLiveMatches';
import { emptyLiveMatchState } from '@/lib/liveMatch/reducer';
import { leaderboardWidget } from '@/lib/widgets/LeaderboardWidget';
import { liveMatchActivity } from '@/lib/widgets/LiveMatchActivity';
import {
    emptyLeaderboardWidget,
    type LeaderboardWidgetProps,
    type LiveMatchActivityProps,
    toLeaderboardWidget,
    toLiveMatchActivity,
} from '@/lib/widgets/props';
import { ScopedLogger } from '@/utils/logging';
import { useSelectedGroupHydrated } from '@/zustand/group/stateGroupStore';
import { useLiveMatchOutboxStore } from '@/zustand/liveMatchOutboxStore';

const logger = new ScopedLogger('widgets');

/** how long a saved match's final score stays on the Lock Screen */
const FINAL_SCORE_MS = 15 * 60 * 1000;

let writtenLeaderboard: string | undefined;

/**
 * Keeps the home screen widget on the selected group's season leaderboard. It only changes
 * while the app runs (the widget can't fetch on its own), so it's as fresh as the app's cache.
 */
export function useLeaderboardWidget() {
    const hydrated = useSelectedGroupHydrated();
    const { groupId, seasonId, group, activeSeason } = useGroup();
    const query = useGetLeaderboardQuery(
        leaderboardWidget ? groupId : null,
        seasonId,
        LeaderboardScope.SEASON
    );
    const entries = query.data?.data?.entries;

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

    const json = hydrated && props ? JSON.stringify(props) : undefined;
    useEffect(() => {
        // reloading a widget is cheap while the app is open, but only reload it on a change
        if (!leaderboardWidget || !json || json === writtenLeaderboard) return;
        try {
            leaderboardWidget.updateSnapshot(JSON.parse(json));
            writtenLeaderboard = json;
        } catch (err) {
            logger.error('failed to update the leaderboard widget', err);
        }
    }, [json]);
}

/** the Live Activity this app runs, with what it shows; at most one */
let current:
    | {
          activity: LiveActivity<LiveMatchActivityProps>;
          props?: LiveMatchActivityProps;
      }
    | undefined;

/** the activity left running by an earlier launch of the app, if any */
function running() {
    if (current || !liveMatchActivity) return current;
    const [activity, ...extra] = liveMatchActivity.getInstances();
    extra.forEach((i) => i.end('immediate'));
    if (activity) current = { activity };
    return current;
}

function showActivity(id: string, props: LiveMatchActivityProps) {
    if (!liveMatchActivity) return;
    const shown = running();
    if (shown) {
        shown.props = props;
        shown.activity.update(props).catch((err) => {
            logger.warn('failed to update the live match activity', err);
        });
        return;
    }
    // throws if the user turned Live Activities off for Versus
    try {
        current = {
            activity: liveMatchActivity.start(
                props,
                `versus://liveMatch?id=${encodeURIComponent(id)}`
            ),
            props,
        };
    } catch (err) {
        logger.warn('failed to start the live match activity', err);
    }
}

function endActivity(finished: boolean) {
    const shown = running();
    if (!shown) return;
    current = undefined;
    const ended =
        finished && shown.props
            ? shown.activity.end(after(new Date(Date.now() + FINAL_SCORE_MS)), {
                  ...shown.props,
                  finished: true,
              })
            : shown.activity.end('immediate');
    ended.catch((err) => {
        logger.warn('failed to end the live match activity', err);
    });
}

const outboxPersist = useLiveMatchOutboxStore.persist;

/**
 * Puts the live match this phone opened last on the Lock Screen and in the Dynamic Island while
 * it's live in the selected group, and ends it when it isn't (saved: with the final score for a
 * while). It follows what this phone's cache knows, so it's as live as the app: socket events
 * move it while the app runs.
 */
export function useLiveMatchActivity() {
    const qc = useQueryClient();
    const groupHydrated = useSelectedGroupHydrated();
    const outboxHydrated = useSyncExternalStore(
        outboxPersist.onFinishHydration,
        outboxPersist.hasHydrated
    );
    const { groupId } = useGroup();
    const lastOpenedId = useLiveMatchOutboxStore((s) =>
        groupId ? s.lastOpenedLiveMatchId[groupId] : undefined
    );
    const followed = liveMatchActivity && lastOpenedId ? groupId : null;

    const listQuery = useLiveMatchesQuery(followed);
    const { matches } = useGroupLiveMatches(followed);
    const match = matches.find((i) => i.id === lastOpenedId);
    const matchId = match?.id;
    const teams = useLiveMatchTeams(
        followed,
        match ?? { seasonId: '', state: emptyLiveMatchState }
    );

    // nothing is ended or started on what the cache didn't know yet
    const ready =
        groupHydrated &&
        outboxHydrated &&
        (!followed || listQuery.data !== undefined);
    const props =
        match &&
        JSON.stringify(
            toLiveMatchActivity({ ...teams, startedAt: match.startedAt })
        );

    useEffect(() => {
        if (!liveMatchActivity || !ready) return;
        if (matchId && props) {
            showActivity(matchId, JSON.parse(props));
            return;
        }
        const ended =
            groupId && lastOpenedId
                ? cachedMatch(qc, groupId, lastOpenedId)
                : undefined;
        endActivity(ended?.status === 'FINISHED');
    }, [qc, ready, groupId, lastOpenedId, matchId, props]);
}
