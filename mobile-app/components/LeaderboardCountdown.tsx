import dayjs from 'dayjs';
import { useState } from 'react';
import { View } from 'react-native';

import Text from '@/components/Text';
import { useInterval } from '@/components/useInterval';
import { getNextWakeTime } from '@/utils/wakeTime';

// the countdown turns red for the last stretch of the day
const ENDSPURT_MINUTES = 60;

/** Counts down to the daily leaderboard's next reset (the group's wake time). */
export function LeaderboardCountdown({
    wakeTime,
}: {
    wakeTime: string | undefined;
}) {
    const [now, setNow] = useState(() => Date.now());
    useInterval(() => setNow(Date.now()), 1000);

    const dailyLeaderboardResetsIn =
        getNextWakeTime(new Date(now), wakeTime).getTime() - now;

    const resetStr = dayjs
        .duration(dailyLeaderboardResetsIn)
        .format('HH:mm:ss');

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
                Daily leaderboard resets in
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
