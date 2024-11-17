import React from 'react';

import { useGroupSettingsProps } from '@/api/propHooks/groupPropHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import LoadingScreen from '@/components/LoadingScreen';
import GroupSettingsScreen from '@/components/screens/GroupSettings';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Screen() {
    const { selectedGroupId } = useGroupStore();
    const { props, isLoading, error, refetch } =
        useGroupSettingsProps(selectedGroupId);
    const nav = useNavigation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !props) {
        return (
            <>
                <Button
                    title="dings"
                    onPress={() => {
                        refetch();
                    }}
                />
                <Button
                    title="anderes dings"
                    onPress={() => nav.navigate('createGroup')}
                />
            </>
        );
    }

    return <GroupSettingsScreen {...props} />;
}
