import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { env } from '@/api/env';
import {
    QK,
    queryKeyStartsWith,
    replaceWildcards,
    useQueryInvalidation,
} from '@/api/utils/reactQuery';
import { Logs } from '@/utils/logging';
import { useLogging } from '@/utils/useLogging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { RealtimeClient, RealtimeEventHandler } from '.';

export function useRealtimeConnection() {
    const { groupIds } = useGroupStore();

    const qc = useQueryClient();

    const client = useRef(new RealtimeClient(env.realtimeBaseUrl, groupIds));

    const { writeLog } = useLogging();

    function writeLogs(...data: Logs) {
        writeLog(...data);
    }
    const { invalidateLeaderboard } = useQueryInvalidation();

    const hoher: RealtimeEventHandler = (e) => {
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
                // refetch because apparently the create player event is for profile?
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
        }
    };

    useEffect(() => {
        if (client.current) {
            client.current.logger.addEventListener('*', writeLogs);

            client.current.on.event(hoher);

            return () =>
                client.current.logger.removeEventListener('*', writeLogs);
        }
    }, [client.current]);

    useEffect(() => {
        client.current.subscribeToGroups(groupIds);
    }, [groupIds]);

    function refetchGroup(groupId: string) {
        qc.invalidateQueries({
            queryKey: [QK.group, groupId],
            exact: true,
        });
    }

    return client.current;
}
