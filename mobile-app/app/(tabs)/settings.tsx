import { useNavigation } from 'expo-router';

import { useGroupSettingsProps } from '@/api/propHooks/groupPropHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import GroupSettingsScreen from '@/components/screens/GroupSettings';

export default function Screen() {
    const { props, isLoading, error } = useGroupSettingsProps('123456');

    const nav = useNavigation();

    if (isLoading) {
        // @ts-ignore
        nav.navigate('createGroup');
        return <LoadingScreen />;
    }

    if (error || !props) {
        return <ErrorScreen message="dumm gelöppt 💀" />;
    }

    return <GroupSettingsScreen {...props} />;
}
