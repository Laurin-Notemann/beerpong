import { View } from 'react-native';

import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import MatchesList from '@/components/MatchesList';
import { mockMatches } from '@/components/mockData/matches';
import { theme } from '@/theme';

export default function Screen() {
    const { matches } = useMatchlistProps();

    return (
        <View
            style={{
                paddingHorizontal: 16,

                backgroundColor: theme.color.bg,
            }}
        >
            <MatchesList matches={matches} />
        </View>
    );
}
