import React from 'react';
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

type PodiumPlace = { player: Player; placement: Placement };

function Place({
    place,
    emptyRank,
    rankingAlgorithm,
    onPlayerPress,
}: {
    place?: PodiumPlace;
    /** the rank an empty spot stands for */
    emptyRank: number;
    rankingAlgorithm: RankingAlgorithm;
    onPlayerPress?: (id: string) => void;
}) {
    const t = useNextTokens();
    const player = place?.player;
    const rank = place?.placement.rank ?? emptyRank;
    // by rank, not spot: players tied for first all stand on the top step
    const isFirst = rank === 1;
    const size = isFirst ? 92 : 68;
    const medal = medalColors[rank - 1];

    return (
        <Pressable
            disabled={!player || !onPlayerPress}
            onPress={() => player && onPlayerPress?.(player.id)}
            style={{
                flex: 1,
                alignItems: 'center',
                paddingTop: isFirst ? 0 : 28,
                opacity: player ? 1 : 0.35,
            }}
        >
            <View>
                <View
                    style={{
                        padding: 3,
                        borderRadius: size,
                        borderWidth: 3,
                        borderColor: medal,
                    }}
                >
                    <Avatar
                        url={player?.avatarUrl}
                        name={player?.name}
                        size={size}
                    />
                </View>
                <View
                    style={{
                        position: 'absolute',
                        bottom: -10,
                        alignSelf: 'center',
                        minWidth: 26,
                        height: 26,
                        paddingHorizontal: 6,
                        borderRadius: 13,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: medal,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: '#1B1B1F',
                        }}
                    >
                        {place?.placement.tied ? `T${rank}` : rank}
                    </Text>
                </View>
            </View>
            <Text
                numberOfLines={1}
                style={{
                    marginTop: 16,
                    fontSize: 15,
                    fontWeight: '600',
                    color: t.text,
                }}
            >
                {player?.name ?? '—'}
            </Text>
            {player && (
                <>
                    <Text
                        style={{
                            fontSize: isFirst ? 26 : 20,
                            fontWeight: '800',
                            fontVariant: ['tabular-nums'],
                            color: t.text,
                        }}
                    >
                        {getRankingAlgorithm(rankingAlgorithm).getDisplayValue(
                            player
                        )}
                    </Text>
                    <Text style={{ fontSize: 12, color: t.textSecondary }}>
                        {plural(player.matches, 'match', 'matches')}
                    </Text>
                </>
            )}
        </Pressable>
    );
}

/**
 * The top three with medal rings, the leader in the middle. Spots follow the
 * golf-style rank, so a tie for first puts two players on the top step.
 * New Design only.
 */
export function NextPodium({
    places,
    rankingAlgorithm,
    onPlayerPress,
}: {
    /** the first three of `rankPlayers` */
    places: PodiumPlace[];
    rankingAlgorithm: RankingAlgorithm;
    onPlayerPress?: (id: string) => void;
}) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingHorizontal: 12,
                marginTop: 24,
                marginBottom: 8,
            }}
        >
            {/* left, middle, right */}
            {([1, 0, 2] as const).map((idx) => (
                <Place
                    key={idx}
                    place={places[idx]}
                    emptyRank={idx + 1}
                    rankingAlgorithm={rankingAlgorithm}
                    onPlayerPress={onPlayerPress}
                />
            ))}
        </View>
    );
}
