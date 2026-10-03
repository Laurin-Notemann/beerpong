import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import Avatar from '@/components/Avatar';
import { medalColors, useNextTokens } from '@/components/next/tokens';
import {
    getRankingAlgorithm,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';
import { plural } from '@/utils/format';

function Place({
    player,
    place,
    size,
    rankingAlgorithm,
    onPlayerPress,
}: {
    player?: Player;
    place: 1 | 2 | 3;
    size: number;
    rankingAlgorithm: RankingAlgorithm;
    onPlayerPress?: (id: string) => void;
}) {
    const t = useNextTokens();
    const medal = medalColors[place - 1];

    return (
        <Pressable
            disabled={!player || !onPlayerPress}
            onPress={() => player && onPlayerPress?.(player.id)}
            style={{
                flex: 1,
                alignItems: 'center',
                paddingTop: place === 1 ? 0 : 28,
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
                        {place}
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
                            fontSize: place === 1 ? 26 : 20,
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

/** The top three with medal rings, winner in the middle. New Design only. */
export function NextPodium({
    firstPlace,
    secondPlace,
    thirdPlace,
    rankingAlgorithm,
    onPlayerPress,
}: {
    firstPlace?: Player;
    secondPlace?: Player;
    thirdPlace?: Player;
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
            <Place
                player={secondPlace}
                place={2}
                size={68}
                rankingAlgorithm={rankingAlgorithm}
                onPlayerPress={onPlayerPress}
            />
            <Place
                player={firstPlace}
                place={1}
                size={92}
                rankingAlgorithm={rankingAlgorithm}
                onPlayerPress={onPlayerPress}
            />
            <Place
                player={thirdPlace}
                place={3}
                size={68}
                rankingAlgorithm={rankingAlgorithm}
                onPlayerPress={onPlayerPress}
            />
        </View>
    );
}
