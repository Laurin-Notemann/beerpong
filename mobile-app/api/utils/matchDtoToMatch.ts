import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { Components } from '@/openapi/openapi';

import { MatchImpl } from '../entities';

export interface PerformedMove {
    id: string;
    title: string;
    points: number;
    count: number;
    pointsForTeam: number;
    isFinish: boolean;
}

export interface TeamMember {
    id: string;
    team: TeamId;
    avatarUrl?: string | null;
    name: string;
    points: number;
    change: number;

    moves: PerformedMove[];
}

export type Match = {
    id: string;
    date: Date;
    redCups: number;
    blueCups: number;
    redTeam: TeamMember[];
    blueTeam: TeamMember[];
};

export const matchDtoToMatch =
    (
        players: Components.Schemas.PlayerDto[] = [],
        allowedMoves: Components.Schemas.RuleMoveDto[] = []
    ) =>
    (i: Components.Schemas.MatchDto): Match => {
        return new MatchImpl(i, players, allowedMoves).toJSON();
    };
