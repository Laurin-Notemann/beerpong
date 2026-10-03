import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { HighestChip, LowestChip } from '@/components/Chip';
import {
    RankingAlgorithm,
    rankingAlgorithms,
    RankingPlayer,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';
import { useScopePicker } from '@/zustand/useScopePicker';

export function Stat({
    value,
    title,
    isHighest = false,
    isLowest = false,
    onPress,
}: {
    value: string | number;
    title: string;
    isHighest?: boolean;
    isLowest?: boolean;
    onPress: () => void;
}) {
    const theme = useTheme();

    return (
        <TouchableOpacity
            // three per row; tapping ranks the leaderboard by this stat
            style={{ alignItems: 'center', width: '33%' }}
            onPress={onPress}
        >
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
        </TouchableOpacity>
    );
}

export interface PlayerStatsProps {
    player: RankingPlayer;
}
/**
 * TODO: in the future, we might want to have some sort of modal or page show up on click,
 * which either explains how these are calculated or shows more detailed stats.
 */
export default function PlayerStats({ player }: PlayerStatsProps) {
    const router = useRouter();

    const scopePicker = useScopePicker();

    return (
        <View
            style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                rowGap: 16,

                width: '100%',
                paddingHorizontal: 16,
                marginBottom: 32,

                opacity: player.matches === 0 ? 0 : 1,
            }}
        >
            {Object.entries(rankingAlgorithms)
                .filter((i) => i[1].showInStats)
                .map(([id, algo]) => (
                    <Stat
                        key={id}
                        title={algo.name}
                        value={algo.getDisplayValue(player, 'stat')}
                        onPress={() => {
                            scopePicker.setRankingAlgorithm(
                                id as RankingAlgorithm
                            );
                            router.dismissAll();
                            router.push({ pathname: '/' });
                        }}
                    />
                ))}
        </View>
    );
}
