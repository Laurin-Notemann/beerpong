import dayjs from 'dayjs';
import { useState } from 'react';
import { View } from 'react-native';

import Text from '@/components/Text';
import { useInterval } from '@/components/useInterval';

const ENDSPURT_MINUTES = 60 * 10;

export function LeaderboardCountdown({
    endDate,
    type,
}: {
    endDate: dayjs.Dayjs;
    type: 'today' | 'season';
}) {
    const [now, setNow] = useState(() => Date.now());
    useInterval(() => setNow(Date.now()), 1000);

    const dailyLeaderboardResetsIn = endDate.diff(now);

    const isOneDayOrMoreAway = dailyLeaderboardResetsIn >= 24 * 60 * 60 * 1000;

    const resetStr = dayjs
        .duration(dailyLeaderboardResetsIn)
        .format(isOneDayOrMoreAway ? 'D HH:mm:ss' : 'HH:mm:ss');

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
