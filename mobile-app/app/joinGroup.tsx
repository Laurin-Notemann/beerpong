import { AxiosError } from 'axios';
import React, { useEffect } from 'react';

import { useFindGroupByInviteCode } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import ErrorScreen from '@/components/ErrorScreen';
import JoinGroup from '@/components/screens/JoinGroup';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const [inviteCode, setInviteCode] = React.useState<string | null>(null);

    const nav = useNavigation();

    const { data, isLoading, error } = useFindGroupByInviteCode(inviteCode);

    const { addGroup, selectGroup } = useGroupStore();

    useEffect(() => {
        if (data?.data?.id) {
            addGroup(data.data.id);
            selectGroup(data.data.id);

            nav.navigate('index');
        }
    }, [data, addGroup, nav]);

    const isNotFound = (error as AxiosError | undefined)?.status === 404;

    if (error && !isNotFound) {
        return (
            <ErrorScreen
                message={(error as Error).message || 'Unknown error'}
            />
        );
    }

    return (
        <JoinGroup
            isNotFound={isNotFound}
            isLoading={isLoading}
            onSubmit={(code) => {
                setInviteCode(code);
            }}
        />
    );
}
