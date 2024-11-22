import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { Logs } from '@/utils/logging';
import { useLogging } from '@/utils/useLogging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import {
    RealtimeAffectedEntity,
    RealtimeClient,
    RealtimeEvent,
    RealtimeEventHandler,
} from '.';
import { env } from '../env';
import { ignoreSeason, QK } from '../utils/reactQuery';

export function useRealtimeConnection() {
    const { groupIds } = useGroupStore();

    const qc = useQueryClient();

    const client = useRef(new RealtimeClient(env.realtimeBaseUrl, groupIds));

    const { writeLog } = useLogging();

    function writeLogs(...data: Logs) {
        writeLog(...data);
    }

    const hoher: RealtimeEventHandler = (e) => {
        switch (e.eventType) {
            case 'GROUPS':
                client.current.logger.info('refetching groups');
                refetchGroup(e.groupId);
                break;
            case 'MATCHES':
                // refetch because of GroupDto.numberOfMatches
                refetchGroup(e.groupId);

                // refetch because of PlayerDto.statistics.matches
                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId, QK.players],
                });

                client.current.logger.info('refetching matches');

                qc.invalidateQueries({
                    predicate: ignoreSeason([QK.group, e.groupId, QK.matches]),
                });
                break;
            case 'SEASONS':
                // refetch because of GroupDto.numberOfSeasons
                refetchGroup(e.groupId);

                // refetch because a newly created season will have new players
                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId, QK.players],
                });

                // refetch because a newly created season will have no matches
                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId, QK.matches],
                });

                client.current.logger.info('refetching seasons');

                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId, QK.seasons],
                });
                break;
            case 'PLAYERS':
                // refetch because of GroupDto.numberOfPlayers
                refetchGroup(e.groupId);

                // TODO: only refetch matches on player delete
                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId, QK.matches],
                });

                client.current.logger.info('refetching players');

                qc.invalidateQueries({
                    predicate: ignoreSeason([QK.group, e.groupId, QK.players]),
                });
                break;
            case 'PROFILES':
                // refetch because apparently the create player event is for profile?
                refetchGroup(e.groupId);

                client.current.logger.info('refetching profiles');
                qc.invalidateQueries({
                    predicate: ignoreSeason([QK.group, e.groupId, QK.players]),
                });
                break;
            case 'RULES':
                client.current.logger.info('refetching rules');
                qc.invalidateQueries({
                    predicate: ignoreSeason([QK.group, e.groupId, QK.rules]),
                });
                break;
            case 'RULE_MOVES':
                // TODO: refetch matches, players (because this updates the scoring system)
                client.current.logger.info('refetching ruleMoves');
                qc.invalidateQueries({
                    predicate: ignoreSeason([
                        QK.group,
                        e.groupId,
                        QK.ruleMoves,
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
