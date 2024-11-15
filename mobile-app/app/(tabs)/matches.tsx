import { View } from 'react-native';

import MatchesList from '@/components/MatchesList';
import { mockMatches } from '@/components/mockData/matches';
import { theme } from '@/theme';

export default function Screen() {
    return (
        <View
            style={{
                paddingHorizontal: 16,

                backgroundColor: theme.color.bg,
            }}
        >
            <MatchesList matches={mockMatches} />
        </View>
    );
}
