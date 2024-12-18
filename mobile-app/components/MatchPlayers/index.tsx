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

    const redTeamPoints = redTeam.reduce((sum, i) => sum + i.points, 0);
    const blueTeamPoints = blueTeam.reduce((sum, i) => sum + i.points, 0);

    return (
        <>
            <MenuSection title={`Blue Team - ${blueTeamPoints} points`}>
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

            <MenuSection title={`Red Team - ${redTeamPoints} points`}>
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
