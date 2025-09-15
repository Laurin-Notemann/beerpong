import { TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { HighestChip, LowestChip } from '@/components/Chip';
import { useTheme } from '@/theme';
import { formatElo } from '@/utils/format';

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
    const theme = useTheme();

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
    totalCups: number;
    totalPoints: number;
    matchesWonCount: number;
    matchesPlayedCount: number;
    elo: number;
}
/**
 * TODO: in the future, we might want to have some sort of modal or page show up on click,
 * which either explains how these are calculated or shows more detailed stats.
 */
export default function PlayerStats({
    totalCups,
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
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
                width: '100%',
            }}
        >
            <TouchableOpacity
                disabled
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
                    isLowest={env.isDev}
                />
                <Stat title="Total points" value={totalPoints || '--'} />
                <Stat title="Total cups" value={totalCups || '--'} />
                <Stat
                    title="Matches won"
                    value={
                        matchesPlayedCount
                            ? `${matchesWonCount} of ${matchesPlayedCount} (${matchesWonPercentage}%)`
                            : '--'
                    }
                    isHighest={env.isDev}
                />
                <Stat title="Elo" value={formatElo(elo)} />
            </TouchableOpacity>
        </ScrollView>
    );
}
