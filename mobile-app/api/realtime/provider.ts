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
        client.current.setGroupIds(groupIds);
    }, [groupIds]);

    client.current.on.event((event) => {
        switch (event.eventType) {
            case 'GROUPS':
                qc.invalidateQueries({ queryKey: ['groups'] });
                break;
            case 'MATCHES':
                console.log('MATCHES', event);
                break;
            case 'SEASONS':
                console.log('SEASONS', event);
                break;
            case 'PLAYERS':
                console.log('PLAYERS', event);
                break;
            case 'RULES':
                console.log('RULES', event);
                break;
        }
    });

    return client.current;
}
