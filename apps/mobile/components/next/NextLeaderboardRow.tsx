import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import Avatar from '@/components/Avatar';
import { medalColors, useNextTokens } from '@/components/next/tokens';
import {
    getRankingAlgorithm,
    type Placement,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';
import { plural } from '@/utils/format';

const CARD_HEIGHT = 64;
const CARD_GAP = 8;
/** card plus the gap below it, fixed so the leaderboard list can position rows without measuring them */
export const NEXT_LEADERBOARD_ROW_HEIGHT = CARD_HEIGHT + CARD_GAP;

/** A leaderboard row as its own rounded card, with a rank chip. New Design only. */
function NextLeaderboardRow({
    player,
    placement,
    unranked,
    rankingAlgorithm,
    onPlayerPress,
}: {
    player: Player;
    placement: Placement;
    unranked: boolean;
    rankingAlgorithm: RankingAlgorithm;
    onPlayerPress?: (id: string) => void;
}) {
    const t = useNextTokens();
    const algo = getRankingAlgorithm(rankingAlgorithm);
    const medal = !unranked ? medalColors[placement.rank - 1] : undefined;

    return (
        <Pressable
            disabled={!onPlayerPress}
            onPress={() => onPlayerPress?.(player.id)}
            accessibilityRole="button"
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                height: CARD_HEIGHT,
                paddingHorizontal: 12,
                marginHorizontal: 16,
                marginBottom: CARD_GAP,
                borderRadius: 16,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: pressed ? t.surfacePressed : t.surface,
                opacity: unranked ? 0.55 : 1,
            })}
        >
            <View
                style={{
                    // grows for "T12"
                    minWidth: 30,
                    height: 30,
                    paddingHorizontal: 4,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: medal ?? t.hairline,
                }}
            >
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '700',
                        fontVariant: ['tabular-nums'],
                        color: medal ? '#1B1B1F' : t.textSecondary,
                    }}
                >
                    {unranked || !player.matches
                        ? '–'
                        : `${placement.tied ? 'T' : ''}${placement.rank}`}
                </Text>
            </View>
            <Avatar
                url={player.avatarUrl}
                name={player.name}
                size={40}
                variant="list"
            />
            <View style={{ flex: 1 }}>
                <Text
                    numberOfLines={1}
                    style={{ fontSize: 16, fontWeight: '600', color: t.text }}
                >
                    {player.name}
                </Text>
                <Text style={{ fontSize: 13, color: t.textSecondary }}>
                    {plural(player.points, 'point', 'points')} ·{' '}
                    {plural(player.matches, 'match', 'matches')}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text
                    style={{
                        fontSize: 17,
                        fontWeight: '700',
                        fontVariant: ['tabular-nums'],
                        color: t.text,
                    }}
                >
                    {algo.getDisplayValue(player)}
                </Text>
                <Text style={{ fontSize: 11, color: t.textSecondary }}>
                    {algo.shortName}
                </Text>
            </View>
        </Pressable>
    );
}

export default memo(NextLeaderboardRow);
