import { TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';

import { HighestChip, LowestChip } from '@/components/Chip';
import { theme } from '@/theme';

export function Stat({
    value,
    title,
    isHighest = false,
    isLowest = false,
}: {
    value: string | number;
    title: string;
    isHighest?: boolean;
    isLowest?: boolean;
}) {
    return (
        <View style={{ alignItems: 'center' }}>
            {isHighest && <HighestChip />}
            {isLowest && <LowestChip />}
            <Text
                style={{
                    fontSize: 17,
                    color: theme.color.text.primary,

                    fontWeight: 600,
                }}
            >
                {value}
            </Text>
            <Text
                style={{
                    fontSize: 12,
                    color: theme.color.text.secondary,

                    fontWeight: 500,
                }}
            >
                {title}
            </Text>
        </View>
    );
}

export interface PlayerStatsProps {
    totalPoints: number;
    matchesWonCount: number;
    matchesPlayedCount: number;
    elo: number;
}
export default function PlayerStats({
    totalPoints,
    matchesWonCount,
    matchesPlayedCount,
    elo,
}: PlayerStatsProps) {
    // account for division by zero
    const averagePointsPerMatch = matchesPlayedCount
        ? (totalPoints / matchesPlayedCount).toFixed(1)
        : '--';

    const matchesWonPercentage = Math.round(
        (matchesWonCount / matchesPlayedCount) * 100
    );

    return (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'flex-end',

                marginBottom: 32,
                gap: 8,
            }}
        >
            <Stat
                title="Average points"
                value={averagePointsPerMatch}
                isLowest
            />
            <Stat title="Total points" value={totalPoints} />
            <Stat
                title="Matches won"
                value={
                    matchesPlayedCount
                        ? `${matchesWonCount} of ${matchesPlayedCount} (${matchesWonPercentage}%)`
                        : '--'
                }
                isHighest
            />
            <Stat title="Elo" value={elo} />
        </TouchableOpacity>
    );
}
