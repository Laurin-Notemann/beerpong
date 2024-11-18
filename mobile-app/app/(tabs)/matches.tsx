import { View } from 'react-native';

import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { theme } from '@/theme';

export default function Screen() {
    const { props, isLoading, error } = useMatchlistProps();

    if (isLoading) return <LoadingScreen />;

    if (!props) return <ErrorScreen error={error} />;

    return (
        <View
            style={{
                paddingHorizontal: 16,

                backgroundColor: theme.color.bg,

                flex: 1,
            }}
        >
            <MatchesList {...props} />
        </View>
    );
}
