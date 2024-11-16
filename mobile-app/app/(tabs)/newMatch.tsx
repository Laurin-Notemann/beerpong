import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import NewMatchAssignTeams, {
    TeamId,
} from '@/components/screens/NewMatchAssignTeams';

const initialPlayers = [
    'Adriana',
    'Bolls',
    'Elina',
    'Institut',
    'Joel',
    'Jonas',
    'Josi',
    'Laurin',
    'Moritz',
    'Ole',
    'Robert',
    'Schicke',
    'Thies',
    'Timon',
];

export default function Screen() {
    const [players, setPlayers] = useState<any[]>(
        initialPlayers.map((name) => ({ id: name, name, team: null }))
    );

    function setTeam(playerId: string, team: TeamId) {
        setPlayers((prev) => {
            const newPlayers = JSON.parse(JSON.stringify(prev)) as typeof prev;

            newPlayers.find((j) => j.id === playerId)!.team = team;

            return newPlayers;
        });
    }

    return (
        <GestureHandlerRootView>
            <NewMatchAssignTeams players={players} setTeam={setTeam} />
        </GestureHandlerRootView>
    );
}
