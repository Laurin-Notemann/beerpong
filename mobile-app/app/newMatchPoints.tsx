import { useNavigation } from 'expo-router';
import React, { useState } from 'react';

import { TeamMember } from '@/components/MatchPlayers';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';

export default function Page() {
    const navigation = useNavigation();

    const [players, setPlayers] = useState<TeamMember[]>([
        {
            id: '#1',
            team: 'blue',
            name: 'Bolls',
            points: 1,
            change: 0.12,
            moves: [
                { id: '#1', count: 1, points: 1, title: 'Normal' },
                { id: '#2', count: 0, points: 2, title: 'Bomb' },
            ],
        },
        {
            id: '#2',
            team: 'red',
            name: 'Schügge',
            points: 0,
            change: -0.2,
            moves: [
                { id: '#1', count: 0, points: 1, title: 'Normal' },
                { id: '#2', count: 0, points: 2, title: 'Bomb' },
            ],
        },
    ]);

    function setMoveCount(userId: string, moveId: string, count: number) {
        setPlayers((prev) => {
            const copy: typeof prev = JSON.parse(JSON.stringify(prev));

            const player = copy.find((i) => i.id === userId);

            if (!player) return prev;

            const move = player?.moves.find((i) => i.id === moveId);

            if (!move) return prev;

            move.count = count;

            return copy;
        });
    }

    return (
        <CreateMatchAssignPoints
            players={players}
            onCreate={() => {
                // @ts-ignore
                navigation.navigate('index');
            }}
            setMoveCount={setMoveCount}
        />
    );
}
