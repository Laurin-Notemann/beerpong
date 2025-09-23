import dayjs from 'dayjs';
import { View } from 'react-native';

import { useRerenderEverySecond } from '@/components/LiveMatchIndicator';
import Text from '@/components/Text';

const ENDSPURT_MINUTES = 60 * 10;

export function LeaderboardCountdown({
    endDate,
    type,
}: {
    endDate: dayjs.Dayjs;
    type: 'today' | 'season';
}) {
    const dailyLeaderboardResetsIn = endDate.diff(dayjs());

    const isOneDayOrMoreAway = dailyLeaderboardResetsIn >= 24 * 60 * 60 * 1000;

    const resetStr = dayjs
        .duration(dailyLeaderboardResetsIn)
        .format(isOneDayOrMoreAway ? 'D HH:mm:ss' : 'HH:mm:ss');

    useRerenderEverySecond();

    const isEndspurt = dailyLeaderboardResetsIn < ENDSPURT_MINUTES * 60 * 1000;

    return (
        <View
            style={{
                alignItems: 'center',
                paddingTop: 16,
                gap: 8,
                marginTop: 16,
            }}
        >
            <Text style={{ fontSize: 16 }} color="secondary">
                {type === 'today'
                    ? 'Daily leaderboard resets in'
                    : 'Season ends in'}
            </Text>
            <Text
                style={{ fontSize: 32, fontWeight: 'bold' }}
                color={isEndspurt ? 'negative' : 'primary'}
            >
                {resetStr}
            </Text>
        </View>
    );
}
