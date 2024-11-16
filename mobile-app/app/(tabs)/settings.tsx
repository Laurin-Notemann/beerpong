import { useGroupSettingsProps } from '@/api/propHooks/groupPropHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import GroupSettingsScreen from '@/components/screens/GroupSettings';

export default function Screen() {
    const { props, isLoading, error } = useGroupSettingsProps('123456');

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !props) {
        return <ErrorScreen message="dumm gelöppt 💀" />;
    }

    return <GroupSettingsScreen {...props} />;
}
