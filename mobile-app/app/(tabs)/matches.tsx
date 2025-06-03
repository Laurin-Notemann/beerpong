import { SafeAreaView } from 'react-native';

import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { AppBackground } from '@/app/Background';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';

export default function Screen() {
    const { props, isLoading, error } = useMatchlistProps();

    const insets = useInsets(true, true);

    if (isLoading) return <LoadingScreen />;

    if (!props) return <ErrorScreen error={error} />;

    return (
        <>
            <AppBackground />
            <SafeAreaView
                style={{
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
            </SafeAreaView>
        </>
    );
}
