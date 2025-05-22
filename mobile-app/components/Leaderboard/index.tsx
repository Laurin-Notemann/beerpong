import React from 'react';
import { Pressable, View, ViewProps } from 'react-native';

import {
    byDescendingAveragePoints,
    Player,
} from '@/api/propHooks/leaderboardPropHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import LeaderboardPlayerItem from '@/components/Leaderboard/LeaderboardPlayerItem';
import Podium from '@/components/Podium';
import Text from '@/components/Text';
import { ThemedView } from '@/components/ThemedView';

import { LeaderBoardSeasonInfo } from './LeaderboardSeasonInfo';

export interface LeaderboardProps extends ViewProps {
    players: Player[];

    withPodium?: boolean;
    showUnranked?: boolean;

    onPlayerPress?: (id: string) => void;

    season?: {
        name: string;
        startDate: string;
        endDate?: string;
        numPlayers: number;
        numMatches: number;
    };
}

export default function Leaderboard({
    players,
    withPodium = true,
    onPlayerPress,
    showUnranked = true,
    season,
    ...rest
}: LeaderboardProps) {
    const nav = useNavigation();

    const minMatchesRequiredToBeRanked = 1;

    const sortedPlayers = players.sort(byDescendingAveragePoints);

    const rankedPlayers = sortedPlayers.filter(
        (i) => i.matches >= minMatchesRequiredToBeRanked
    );
    const nonPodiumPlayers = withPodium
        ? rankedPlayers.slice(3)
        : rankedPlayers;

    const unrankedPlayers = sortedPlayers.filter(
        (i) => i.matches < minMatchesRequiredToBeRanked
    );

    return (
        <View
            {...rest}
            style={[rest.style, { width: '100%', alignItems: 'center' }]}
        >
            {season && <LeaderBoardSeasonInfo {...season} />}
            {withPodium && (
                <Podium
                    firstPlace={rankedPlayers[0]}
                    secondPlace={rankedPlayers[1]}
                    thirdPlace={rankedPlayers[2]}
                    onPlayerPress={onPlayerPress}
                />
            )}
            <ThemedView
                style={{
                    alignSelf: 'stretch',
                    paddingTop: 14,
                }}
            >
                {nonPodiumPlayers.map((i, idx) => (
                    <LeaderboardPlayerItem
                        key={idx}
                        name={i.name}
                        id={i.id}
                        placement={idx + (withPodium ? 4 : 1)}
                        points={i.points}
                        matches={i.matches}
                        elo={i.elo}
                        matchesWon={i.matchesWon}
                        avatarUrl={i.avatarUrl}
                        onPlayerPress={onPlayerPress}
                    />
                ))}
                {showUnranked && unrankedPlayers.length ? (
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
                {showUnranked &&
                    unrankedPlayers.map((i, idx) => (
                        <LeaderboardPlayerItem
                            key={idx}
                            name={i.name}
                            id={i.id}
                            placement={
                                sortedPlayers.findIndex((j) => j.id === i.id) +
                                1
                            }
                            points={i.points}
                            matches={i.matches}
                            elo={i.elo}
                            matchesWon={i.matchesWon}
                            avatarUrl={i.avatarUrl}
                            unranked
                            onPlayerPress={onPlayerPress}
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
        </View>
    );
}
