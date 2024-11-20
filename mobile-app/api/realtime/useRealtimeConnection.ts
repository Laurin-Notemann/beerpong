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

    client.current.on.event((e) => {
        switch (e.eventType) {
            case 'GROUPS':
                client.current.logger.info('refetching groups');

                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId],
                    exact: true,
                });
                break;
            case 'MATCHES':
                client.current.logger.info('refetching matches');
                qc.invalidateQueries({
                    predicate: ignoreSeason([QK.group, e.groupId, QK.matches]),
                });
                break;
            case 'SEASONS':
                client.current.logger.info('refetching seasons');
                qc.invalidateQueries({
                    queryKey: [QK.group, e.groupId, QK.seasons],
                });
                break;
            case 'PLAYERS':
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
