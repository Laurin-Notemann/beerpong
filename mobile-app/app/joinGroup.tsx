import React, { useEffect } from 'react';

import { useFindGroupByInviteCode } from '@/api/calls/group/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import ErrorScreen from '@/components/ErrorScreen';
import JoinGroup from '@/components/screens/JoinGroup';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const nav = useNavigation();
    const [inviteCode, setInviteCode] = React.useState<string | null>(null);
    const [error, setError] = React.useState('');

    const { data, isSuccess } = useFindGroupByInviteCode(inviteCode);

    const { addGroup } = useGroupStore();

    useEffect(() => {
        setError('');
        if (data?.data && isSuccess) {
            if (!data?.data?.id) {
                setError('Group not found');
                return;
            }

            addGroup(data.data.id);

            nav.navigate('index');
        }
    }, [setError, data, addGroup, nav, isSuccess]);

    if (error) {
        return <ErrorScreen message={error} />;
    }

    return (
        <JoinGroup
            onSubmit={(code) => {
                setInviteCode(code);
            }}
        />
    );
}
