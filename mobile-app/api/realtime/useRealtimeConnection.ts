import { useQueryClient } from '@tanstack/react-query';
import {
    useCallback,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
} from 'react';

import { env } from '@/api/env';
import {
    applyLiveMatchEvent,
    invalidateLiveMatches,
} from '@/api/liveMatch/liveMatchCache';
import {
    QK,
    queryKeyStartsWith,
    replaceWildcards,
    useQueryInvalidation,
} from '@/api/utils/reactQuery';
import { Logs } from '@/utils/logging';
import { useLogging } from '@/utils/useLogging';

import { RealtimeClient, RealtimeEventHandler } from '.';

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

    function refetchGroup(groupId: string) {
        qc.invalidateQueries({
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
                invalidateLeaderboard(e.groupId);

                // refetch because of GroupDto.numberOfMatches
                refetchGroup(e.groupId);

                // refetch because of PlayerDto.statistics.matches
                qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });

                client.current.logger.info('refetching matches');

                qc.invalidateQueries({
                    predicate: replaceWildcards(
                        [QK.group, e.groupId, QK.season, '*', QK.matches],
                        { startsWith: true }
                    ),
                });
                break;
            case 'SEASONS':
                invalidateLeaderboard(e.groupId);
                // refetch because of GroupDto.numberOfSeasons
                refetchGroup(e.groupId);

                // refetch because a newly created season will have new players
                qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });

                // refetch because a newly created season will have no matches
                qc.invalidateQueries({
                    predicate: replaceWildcards(
                        [QK.group, e.groupId, QK.season, '*', QK.matches],
                        { startsWith: true }
                    ),
                });

                client.current.logger.info('refetching seasons');

                qc.invalidateQueries({
                    predicate: queryKeyStartsWith([
                        QK.group,
                        e.groupId,
                        QK.seasons,
                    ]),
                });
                break;
            case 'PLAYERS':
                invalidateLeaderboard(e.groupId);
                // refetch because of GroupDto.numberOfPlayers
                refetchGroup(e.groupId);

                // TODO: only refetch matches on player delete
                qc.invalidateQueries({
                    predicate: replaceWildcards(
                        [QK.group, e.groupId, QK.season, '*', QK.matches],
                        { startsWith: true }
                    ),
                });

                client.current.logger.info('refetching players');

                qc.invalidateQueries({
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
                invalidateLeaderboard(e.groupId);
                // refetch because the create player event is for profile
                refetchGroup(e.groupId);

                client.current.logger.info('refetching profiles');
                qc.invalidateQueries({
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
                qc.invalidateQueries({
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
                qc.invalidateQueries({
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

                invalidateLeaderboard(e.groupId);

                qc.invalidateQueries({
                    predicate: replaceWildcards([
                        QK.group,
                        e.groupId,
                        QK.season,
                        '*',
                        QK.players,
                    ]),
                });
                qc.invalidateQueries({
                    predicate: queryKeyStartsWith([
                        QK.group,
                        e.groupId,
                        QK.seasons,
                    ]),
                });
                break;

            case 'LIVE_MATCHES':
                // applied directly: ops arrive often and carry everything needed
                applyLiveMatchEvent(qc, e.groupId, e.scope, e.body);
                break;
        }
    });

    useEffect(() => {
        if (!realtime) return;

        const log = (...data: Logs) => writeLogs(...data);
        realtime.logger.addEventListener('*', log);
        realtime.on.event((e) => onRealtimeEvent(e));
        const offReconnect = realtime.on.reconnect(() =>
            invalidateLiveMatches(qc)
        );

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
