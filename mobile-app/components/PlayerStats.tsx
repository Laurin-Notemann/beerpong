import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { HighestChip, LowestChip } from '@/components/Chip';
import {
    rankingAlgorithms,
    RankingPlayer,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';

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
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={onPress}>
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

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
                width: '100%',
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',

                    marginBottom: 32,
                    gap: 8,

                    paddingHorizontal: 16,
                }}
            >
                {Object.entries(rankingAlgorithms)
                    .filter((i) => i[1].showInStats)
                    .map(([id, algo]) => (
                        <Stat
                            key={id}
                            title={algo.name}
                            value={algo.getDisplayValue(player, 'stat')}
                            // isLowest={env.isDev}
                            onPress={() => {
                                router.dismissAll();
                                router.push({
                                    pathname: '/',
                                    params: { sortBy: id },
                                });
                            }}
                        />
                    ))}
            </View>
        </ScrollView>
    );
}
