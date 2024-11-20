import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { RealtimeClient } from '.';
import { env } from '../env';
import { ignoreSeason, QK } from '../utils/reactQuery';

export function useRealtimeConnection() {
    const { groupIds } = useGroupStore();

    const qc = useQueryClient();

    const client = useRef(new RealtimeClient(env.realtimeBaseUrl, groupIds));

    useEffect(() => {
        client.current.subscribeToGroups(groupIds);
    }, [groupIds]);

    function refetchGroup(groupId: string) {
        qc.invalidateQueries({
            queryKey: [QK.group, groupId],
            exact: true,
        });
    }

    client.current.on.event((e) => {
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
                client.current.logger.info('refetching players');
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
    });

    return client.current;
}
