import { useGroupSettingsProps } from '@/api/hooks/groupHooks';
import GroupSettingsScreen from '@/components/screens/GroupSettings';
import Text from '@/components/Text';

export default function Screen() {
    const { props, isLoading, error } = useGroupSettingsProps('123456');

    if (isLoading) {
        return <Text color="primary">Loading...</Text>;
    }

    if (error || !props) {
        return <Text color="negative">Error</Text>;
    }

    return <GroupSettingsScreen {...props} />;
}
