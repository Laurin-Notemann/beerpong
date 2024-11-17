import React from 'react';

import Podium from '../Podium';
import { ThemedView } from '../ThemedView';
import LeaderboardPlayerItem from './LeaderboardPlayerItem';
import { Player } from '@/api/propHooks/leaderboardPropHooks';

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
                        placement={idx + 3}
                        points={i.points}
                        matches={i.matches}
                        elo={i.elo}
                        matchesWon={i.matchesWon}
                    />
                ))}
            </ThemedView>
        </>
    );
}
