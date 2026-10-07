import { View } from 'react-native';

import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';

export const LeaderboardEmptyComponent: React.FC<{ message?: string }> = ({
    message = 'No Matches Played Yet',
}) => {
    return (
        <View style={{ marginBottom: 64 }}>
            <NoMatchesPlayedYet message={message} />
        </View>
    );
};
