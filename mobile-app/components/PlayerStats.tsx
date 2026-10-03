import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { HighestChip, LowestChip } from '@/components/Chip';
import { useNextTokens } from '@/components/next/tokens';
import {
    RankingAlgorithm,
    rankingAlgorithms,
    RankingPlayer,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';
import { useNewDesign } from '@/zustand/localSettingsStore';
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
    const newDesign = useNewDesign();
    const t = useNextTokens();

    if (newDesign) {
        // a tile per stat, three to a row
        return (
            <View style={{ width: '33.33%', padding: 4 }}>
                <TouchableOpacity
                    onPress={onPress}
                    style={{
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        borderWidth: 1,
                        borderColor: t.hairline,
                        backgroundColor: t.surface,
                    }}
                >
                    <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.6}
                        style={{
                            paddingHorizontal: 6,
                            fontSize: 20,
                            fontWeight: '700',
                            fontVariant: ['tabular-nums'],
                            color: t.text,
                        }}
                    >
                        {value}
                    </Text>
                    <Text
                        style={{
                            marginTop: 2,
                            fontSize: 12,
                            color: t.textSecondary,
                        }}
                    >
                        {title}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

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
    const newDesign = useNewDesign();

    return (
        <View
            style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                rowGap: newDesign ? 0 : 16,

                width: '100%',
                paddingHorizontal: newDesign ? 12 : 16,
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
