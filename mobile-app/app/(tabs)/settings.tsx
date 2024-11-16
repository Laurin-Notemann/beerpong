import { useNavigation } from 'expo-router';

import { useGroupSettingsProps } from '@/api/propHooks/groupPropHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import GroupSettingsScreen from '@/components/screens/GroupSettings';

export default function Screen() {
    const { props, isLoading, error } = useGroupSettingsProps('123456');
    const nav = useNavigation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !props) {
        // @ts-ignore
        return (
            <ErrorScreen
                message="dumm gelöppt 💀"
                onTouchStart={() => {
                    nav.navigate('createGroup');
                }}
            />
        );
    }

    return <GroupSettingsScreen {...props} />;
}
