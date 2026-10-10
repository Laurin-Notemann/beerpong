import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Match } from '@/api/utils/matchDtoToMatch';
import { HighestChip, LowestChip } from '@/components/Chip';
import { useNextTokens } from '@/components/next/tokens';
import { PlayerStatChart } from '@/components/PlayerStatChart';
import {
    RankingAlgorithm,
    rankingAlgorithms,
    RankingPlayer,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';
import { useNewDesign } from '@/zustand/localSettingsStore';

export function Stat({
    value,
    title,
    isHighest = false,
    isLowest = false,
    isSelected = false,
    onPress,
}: {
    value: string | number;
    title: string;
    isHighest?: boolean;
    isLowest?: boolean;
    isSelected?: boolean;
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
                        borderColor: isSelected
                            ? theme.color.text.branding
                            : t.hairline,
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
            // three per row; tapping charts this stat
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
                    color: isSelected
                        ? theme.color.text.branding
                        : theme.color.text.secondary,

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
    profileId: string;
    /** the matches `player`'s stats are from */
    matches: Match[];
}
/** The player's stats; tapping one charts it over their matches below. */
export default function PlayerStats({
    player,
    profileId,
    matches,
}: PlayerStatsProps) {
    const newDesign = useNewDesign();

    const [selected, setSelected] = useState<RankingAlgorithm | null>(null);

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
                        isSelected={selected === id}
                        onPress={() =>
                            setSelected((prev) =>
                                prev === id ? null : (id as RankingAlgorithm)
                            )
                        }
                    />
                ))}
            {selected && (
                <PlayerStatChart
                    stat={selected}
                    profileId={profileId}
                    matches={matches}
                    elo={player.elo}
                />
            )}
        </View>
    );
}
