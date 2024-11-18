import { View } from 'react-native';

import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import MatchesList from '@/components/MatchesList';
import { theme } from '@/theme';

export default function Screen() {
    const { matches } = useMatchlistProps();

    return (
        <View
            style={{
                paddingHorizontal: 16,

                backgroundColor: theme.color.bg,

                flex: 1,
            }}
        >
            <MatchesList matches={matches} />
        </View>
    );
}
