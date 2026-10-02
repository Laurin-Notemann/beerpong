import React from 'react';

import { useGroupSettingsProps } from '@/api/propHooks/groupPropHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import GroupSettingsScreen from '@/components/screens/GroupSettings';

export default function Screen() {
    const { props, isLoading, error } = useGroupSettingsProps();

    if (isLoading) return <LoadingScreen />;

    if (!props) return <ErrorScreen error={error} />;

    return <GroupSettingsScreen {...props} />;
}
