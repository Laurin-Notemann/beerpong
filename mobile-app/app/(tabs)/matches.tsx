import { View } from 'react-native';

import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { theme } from '@/theme';

export default function Screen() {
    const { props, isLoading, error } = useMatchlistProps();

    const insets = useInsets(true, true);

    if (isLoading) return <LoadingScreen />;

    if (!props) return <ErrorScreen error={error} />;

    return (
        <View
            style={{
                backgroundColor: theme.color.bg,

                flex: 1,
            }}
        >
            <MatchesList
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 32,
                }}
                {...props}
            />
        </View>
    );
}
