import React, { useState } from 'react';

import MenuSection from '../Menu/MenuSection';
import { TeamId } from '../screens/NewMatchAssignTeams';
import Player, { PerformedMove } from './Player';

export interface TeamMember {
    id: string;
    team: TeamId;
    avatarUrl?: string | null;
    name: string;
    points: number;
    change: number;

    moves: PerformedMove[];
}

export interface MatchPlayersProps {
    editable?: boolean;
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;
}
export default function MatchPlayers({
    editable,
    players,
    setMoveCount,
}: MatchPlayersProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const redTeam = players.filter((i) => i.team === 'red');
    const blueTeam = players.filter((i) => i.team === 'blue');

    const redTeamPoints = redTeam.reduce((sum, i) => sum + i.points, 0);
    const blueTeamPoints = blueTeam.reduce((sum, i) => sum + i.points, 0);

    return (
        <>
            <MenuSection title={`Red Team - ${redTeamPoints} points`}>
                {redTeam.map((i, idx) => (
                    <Player
                        key={idx}
                        id={i.id}
                        avatarUrl={i.avatarUrl!}
                        team={i.team!}
                        name={i.name}
                        points={i.points}
                        change={i.change}
                        expanded={expandedId === idx}
                        setIsExpanded={(value) =>
                            setExpandedId(value ? idx : null)
                        }
                        editable={editable}
                        setMoveCount={setMoveCount}
                        moves={i.moves}
                    />
                ))}
            </MenuSection>

            <MenuSection title={`Blue Team - ${blueTeamPoints} points`}>
                {blueTeam.map((i, idx) => (
                    <Player
                        key={idx}
                        id={i.id}
                        avatarUrl={i.avatarUrl!}
                        team={i.team!}
                        name={i.name}
                        points={i.points}
                        change={i.change}
                        expanded={expandedId === idx}
                        setIsExpanded={(value) =>
                            setExpandedId(value ? idx : null)
                        }
                        editable={editable}
                        setMoveCount={setMoveCount}
                        moves={i.moves}
                    />
                ))}
            </MenuSection>
        </>
    );
}
