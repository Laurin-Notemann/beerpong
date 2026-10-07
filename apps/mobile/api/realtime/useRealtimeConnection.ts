import { useQueryClient } from '@tanstack/react-query';
import {
    useCallback,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
} from 'react';

import { applyFormationEvent } from '@/api/calls/formationHooks';
import { applyTournamentEvent } from '@/api/calls/tournamentHooks';
import {
    applyVisionHitEvent,
    invalidateVisionHits,
} from '@/api/calls/visionHitHooks';
import { env } from '@/api/env';
import {
    applyLiveMatchEvent,
    invalidateLiveMatches,
} from '@/api/liveMatch/liveMatchCache';
import { RealtimeClient, RealtimeEventHandler } from '@/api/realtime';
import {
    QK,
    queryKeyStartsWith,
    replaceWildcards,
    useQueryInvalidation,
} from '@/api/utils/reactQuery';
import { Logs } from '@/utils/logging';
import { useLogging } from '@/utils/useLogging';

export function useRealtimeConnection() {
    const qc = useQueryClient();

    // One socket for the whole app; `client.current` is read by the event handler
    // and always holds the same client as `realtime`.
    const [realtime, setRealtime] = useState<RealtimeClient | null>(null);
    const client = useRef<RealtimeClient | null>(null);

    const { writeLog } = useLogging();

    const writeLogs = useEffectEvent((...data: Logs) => {
        writeLog(...data);
    });
    const { invalidateLeaderboard } = useQueryInvalidation();

    function invalidateProfiles(groupId: string) {
        void qc.invalidateQueries({
            queryKey: [QK.group, groupId, QK.profiles],
            exact: true,
        });
    }

    function refetchGroup(groupId: string) {
        void qc.invalidateQueries({
            queryKey: [QK.group, groupId],
            exact: true,
        });
    }

    const onRealtimeEvent = useEffectEvent<RealtimeEventHandler>((e) => {
        if (!client.current) return;

        switch (e.eventType) {
            case 'GROUPS':
                client.current.logger.info('refetching groups');
                refetchGroup(e.groupId);
                break;
            case 'MATCHES':
                void invalidateLeaderboard(e.groupId);

                // refetch because of GroupDto.numberOfMatches
                refetchGroup(e.groupId);

                // refetch because of PlayerDto.statistics.matches
                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });

                client.current.logger.info('refetching matches');

                void qc.invalidateQueries({
                    predicate: replaceWildcards(
                        [QK.group, e.groupId, QK.season, '*', QK.matches],
                        { startsWith: true }
                    ),
                });
                break;
            case 'SEASONS':
                void invalidateLeaderboard(e.groupId);
                // refetch because of GroupDto.numberOfSeasons
                refetchGroup(e.groupId);

                // refetch because a newly created season will have new players
                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });

                // refetch because a newly created season will have no matches
                void qc.invalidateQueries({
                    predicate: replaceWildcards(
                        [QK.group, e.groupId, QK.season, '*', QK.matches],
                        { startsWith: true }
                    ),
                });

                client.current.logger.info('refetching seasons');

                void qc.invalidateQueries({
                    predicate: queryKeyStartsWith([
                        QK.group,
                        e.groupId,
                        QK.seasons,
                    ]),
                });
                break;
            case 'PLAYERS':
                void invalidateLeaderboard(e.groupId);
                // refetch because of GroupDto.numberOfPlayers
                refetchGroup(e.groupId);

                // TODO: only refetch matches on player delete
                void qc.invalidateQueries({
                    predicate: replaceWildcards(
                        [QK.group, e.groupId, QK.season, '*', QK.matches],
                        { startsWith: true }
                    ),
                });

                client.current.logger.info('refetching players');

                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });
                break;
            case 'PROFILES':
                // first: the queries below read the profiles through fetchProfiles
                invalidateProfiles(e.groupId);
                void invalidateLeaderboard(e.groupId);
                // refetch because the create player event is for profile
                refetchGroup(e.groupId);

                client.current.logger.info('refetching profiles');
                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });
                break;
            case 'RULES':
                client.current.logger.info('refetching rules');
                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.rules,
                    ]),
                });
                break;
            case 'RULE_MOVES':
                // TODO: refetch matches, players (because this updates the scoring system)
                client.current.logger.info('refetching ruleMoves');
                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.ruleMoves,
                    ]),
                });
                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });
                break;

            case 'ASSETS':
                client.current.logger.info('refetching assets');

                // an avatar changed: profiles carry its url
                invalidateProfiles(e.groupId);
                void invalidateLeaderboard(e.groupId);

                void qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });
                void qc.invalidateQueries({
                    predicate: queryKeyStartsWith([
                        QK.group,
                        e.groupId,
                        QK.seasons,
                    ]),
                });
                // the wallpaper is found through the group
                if (e.scope.startsWith('groupWallpaper')) {
                    refetchGroup(e.groupId);
                }
                // a team photo is found through its match
                if (e.scope.startsWith('matchTeamPhoto')) {
                    void qc.invalidateQueries({
                        predicate: replaceWildcards([
                            QK.group,
                            e.groupId,
                            QK.season,
                            '*',
                            QK.matches,
                        ]),
                    });
                }
                break;

            case 'LIVE_MATCHES':
                // applied directly: ops arrive often and carry everything needed
                applyLiveMatchEvent(qc, e.groupId, e.scope, e.body);
                break;
            case 'TOURNAMENTS':
                applyTournamentEvent(qc, e.groupId, e.body);
                break;
            case 'VISION_HITS':
                applyVisionHitEvent(qc, e.groupId, e.scope, e.body);
                break;
            case 'FORMATIONS':
                applyFormationEvent(qc, e.groupId, e.scope, e.body);
                break;
        }
    });

    useEffect(() => {
        if (!realtime) return;

        const log = (...data: Logs) => writeLogs(...data);
        realtime.logger.addEventListener('*', log);
        realtime.on.event((e) => onRealtimeEvent(e));
        const offReconnect = realtime.on.reconnect(() => {
            void invalidateLiveMatches(qc);
            void invalidateVisionHits(qc);
            void qc.invalidateQueries({
                predicate: (query) => query.queryKey.includes(QK.tournaments),
            });
        });

        return () => {
            realtime.logger.removeEventListener('*', log);
            offReconnect();
        };
    }, [realtime, qc]);

    /** Opens the socket on first call; later calls only change the subscribed groups. */
    const connectRealtime = useCallback((groupIds: string[]) => {
        if (client.current) {
            client.current.subscribeToGroups(groupIds);
            return;
        }
        const created = new RealtimeClient(env.realtimeBaseUrl, groupIds);
        client.current = created;
        setRealtime(created);
    }, []);

    return { realtime, connectRealtime };
}
