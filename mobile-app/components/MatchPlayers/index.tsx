import React, { useState } from 'react';

import { TeamMember } from '@/api/utils/matchDtoToMatch';

import MenuSection from '../Menu/MenuSection';
import Player from './Player';

export interface MatchPlayersProps {
    editable?: boolean;
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;
    onPlayerPress: (player: TeamMember) => void;
}
export default function MatchPlayers({
    editable,
    players,
    setMoveCount,
    onPlayerPress,
}: MatchPlayersProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const redTeam = players.filter((i) => i.team === 'red');
    const blueTeam = players.filter((i) => i.team === 'blue');

    const redTeamCups = redTeam.reduce(
        (sum, i) => sum + i.moves.reduce((sum2, j) => sum2 + j.count, 0),
        0
    );
    const blueTeamCups = blueTeam.reduce(
        (sum, i) => sum + i.moves.reduce((sum2, j) => sum2 + j.count, 0),
        0
    );

    return (
        <>
            <MenuSection title={`Blue Team - ${blueTeamCups} cups`}>
                {blueTeam.map((i, idx) => (
                    <Player
                        key={idx}
                        player={i}
                        expanded={false}
                        setIsExpanded={(value) =>
                            setExpandedId(value ? idx : null)
                        }
                        onPress={() => onPlayerPress(i)}
                        editable={editable}
                        setMoveCount={setMoveCount}
                    />
                ))}
            </MenuSection>

            <MenuSection title={`Red Team - ${redTeamCups} cups`}>
                {redTeam.map((i, idx) => (
                    <Player
                        key={idx}
                        player={i}
                        expanded={false}
                        setIsExpanded={(value) =>
                            setExpandedId(value ? idx : null)
                        }
                        onPress={() => onPlayerPress(i)}
                        editable={editable}
                        setMoveCount={setMoveCount}
                    />
                ))}
            </MenuSection>
        </>
    );
}
