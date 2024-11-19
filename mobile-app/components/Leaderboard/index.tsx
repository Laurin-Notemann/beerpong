import { Link } from '@react-navigation/native';
import React from 'react';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import { theme } from '@/theme';

import Podium from '../Podium';
import Text from '../Text';
import { ThemedView } from '../ThemedView';
import LeaderboardPlayerItem from './LeaderboardPlayerItem';

export interface LeaderboardProps {
    players: Player[];
}

export default function Leaderboard({ players }: LeaderboardProps) {
    const sortedPlayers = players.sort((a, b) => b.points - a.points);
    const nonPodiumPlayers = sortedPlayers.slice(3);

    return (
        <>
            <Podium
                firstPlace={sortedPlayers[0]}
                secondPlace={sortedPlayers[1]}
                thirdPlace={sortedPlayers[2]}
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
                        placement={idx + 3}
                        points={i.points}
                        matches={i.matches}
                        elo={i.elo}
                        matchesWon={i.matchesWon}
                    />
                ))}
                {players.length < 1 && (
                    <Text
                        color="secondary"
                        style={{
                            textAlign: 'center',
                            paddingTop: 64,
                            lineHeight: 32,
                        }}
                    >
                        No matches played yet. {'\n'}
                        <Link
                            to="/newMatch"
                            style={{
                                color: theme.color.text.primary,
                                fontWeight: 500,
                            }}
                        >
                            Create match
                        </Link>
                    </Text>
                )}
            </ThemedView>
        </>
    );
}
