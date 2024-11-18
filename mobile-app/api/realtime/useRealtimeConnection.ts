import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { RealtimeClient } from '.';
import { env } from '../env';

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
                qc.invalidateQueries({ queryKey: ['group', e.groupId] });
                break;
            case 'MATCHES':
                qc.invalidateQueries({
                    queryKey: ['group', e.groupId, 'matches'],
                    exact: false,
                });
                break;
            case 'SEASONS':
                // eslint-disable-next-line
                console.log('SEASONS', e);
                break;
            case 'PLAYERS':
                qc.invalidateQueries({
                    queryKey: ['group', e.groupId, 'seasons'],
                    exact: false,
                });
                break;
            case 'RULES':
                // eslint-disable-next-line
                console.log('RULES', e);
                break;
            case 'RULE_MOVES':
                qc.invalidateQueries({
                    queryKey: ['group', e.groupId, 'ruleMoves'],
                    exact: false,
                });
                break;
        }
    });

    return client.current;
}
