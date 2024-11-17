import React from 'react';

import { useGroupSettingsProps } from '@/api/propHooks/groupPropHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import ErrorScreen from '@/components/ErrorScreen';
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
            <ErrorScreen
                message={
                    <>
                        <Button
                            title="refetch"
                            onPress={() => {
                                refetch();
                            }}
                        />
                        <Button
                            title="createGroup"
                            onPress={() => nav.navigate('createGroup')}
                        />
                    </>
                }
            />
        );
    }

    return <GroupSettingsScreen {...props} />;
}
