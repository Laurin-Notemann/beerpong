import React from 'react';
import { Pressable, View } from 'react-native';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import { useNavigation } from '@/app/navigation/useNavigation';

import Podium from '../Podium';
import Text from '../Text';
import { ThemedView } from '../ThemedView';
import LeaderboardPlayerItem from './LeaderboardPlayerItem';

export interface LeaderboardProps {
    players: Player[];
}

export default function Leaderboard({ players }: LeaderboardProps) {
    const nav = useNavigation();

    const minMatchesRequiredToBeRanked = 1;

    const sortedPlayers = players.sort(
        (a, b) =>
            (b.matches ? b.points / b.matches : 0) -
            (a.matches ? a.points / a.matches : 0)
    );

    const rankedPlayers = sortedPlayers.filter(
        (i) => i.matches >= minMatchesRequiredToBeRanked
    );
    const nonPodiumPlayers = rankedPlayers.slice(3);

    const unrankedPlayers = sortedPlayers.filter(
        (i) => i.matches < minMatchesRequiredToBeRanked
    );

    return (
        <>
            <Podium
                firstPlace={rankedPlayers[0]}
                secondPlace={rankedPlayers[1]}
                thirdPlace={rankedPlayers[2]}
            />
            <ThemedView
                style={{
                    alignSelf: 'stretch',
                    // paddingHorizontal: 16,
                    paddingTop: 14,
                }}
            >
                {nonPodiumPlayers.map((i, idx) => (
                    <LeaderboardPlayerItem
                        key={idx}
                        name={i.name}
                        id={i.id}
                        placement={idx + 4}
                        points={i.points}
                        matches={i.matches}
                        elo={i.elo}
                        matchesWon={i.matchesWon}
                        avatarUrl={i.avatarUrl}
                    />
                ))}
                {unrankedPlayers.length ? (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            height: 64,
                            paddingHorizontal: 8,
                            paddingVertical: 12,
                        }}
                    >
                        <Text
                            color="primary"
                            style={{
                                fontSize: 17,
                            }}
                        >
                            Unranked
                        </Text>
                        <Text
                            color="secondary"
                            style={{
                                fontSize: 12,
                            }}
                        >
                            {minMatchesRequiredToBeRanked > 1
                                ? `${minMatchesRequiredToBeRanked} matches required to qualify`
                                : `${minMatchesRequiredToBeRanked} match required to qualify`}
                        </Text>
                    </View>
                ) : null}
                {unrankedPlayers.map((i, idx) => (
                    <LeaderboardPlayerItem
                        key={idx}
                        name={i.name}
                        id={i.id}
                        placement={
                            sortedPlayers.findIndex((j) => j.id === i.id) + 1
                        }
                        points={i.points}
                        matches={i.matches}
                        elo={i.elo}
                        matchesWon={i.matchesWon}
                        avatarUrl={i.avatarUrl}
                        unranked
                    />
                ))}
                {players.length < 1 && (
                    <Pressable onPress={() => nav.navigate('newMatch')}>
                        <Text
                            color="secondary"
                            style={{
                                textAlign: 'center',
                                paddingTop: 64,
                                lineHeight: 32,
                            }}
                        >
                            No matches played yet. {'\n'}
                            <Text
                                color="primary"
                                style={{
                                    fontWeight: 500,
                                }}
                            >
                                Create match
                            </Text>
                        </Text>
                    </Pressable>
                )}
            </ThemedView>
        </>
    );
}
