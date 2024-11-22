/* eslint @typescript-eslint/explicit-function-return-type: ["error"] */
import { Components } from '@/openapi/openapi';

import { Match, PerformedMove, TeamMember } from '../utils/matchDtoToMatch';

// TODO: respect pointsForTeam for point calculation

export class RuleMoveImpl {
    public id: string;
    public name: string;
    public finishingMove: boolean;
    public pointsForScorer: number;
    public pointsForTeam: number;

    constructor(_data: Components.Schemas.RuleMoveDto) {
        this.id = _data.id!;
        this.name = _data.name!;
        this.finishingMove = _data.finishingMove!;
        this.pointsForScorer = _data.pointsForScorer!;
        this.pointsForTeam = _data.pointsForTeam!;
    }
}

export class MatchMoveImpl {
    public count: number;

    public moveId: string;
    public move!: RuleMoveImpl;

    public get title(): string {
        return this.move!.name;
    }
    public get points(): number {
        return this.move!.pointsForScorer!;
    }
    public get pointsForTeam(): number {
        return this.move!.pointsForTeam;
    }
    public get isFinish(): boolean {
        return this.move!.finishingMove;
    }

    public get id(): string {
        return this.move!.id;
    }

    public teamMemberId: string;

    public setRuleMove(ruleMove: RuleMoveImpl): void {
        this.move = ruleMove;
        this.moveId = ruleMove.id;
    }

    constructor(_data: Components.Schemas.MatchMoveDtoComplete) {
        this.moveId = _data.moveId!;
        this.count = _data.value!;
        this.teamMemberId = _data.teamMemberId!;
    }

    public toJSON(): PerformedMove {
        return {
            id: this.id,
            count: this.count,
            title: this.title,
            points: this.points,
            isFinish: this.isFinish,
            pointsForTeam: this.pointsForTeam,
        };
    }
}

export class ProfileImpl {
    public id: string;
    public name: string;
    public avatarUrl: string | null;

    constructor(_data: Components.Schemas.ProfileDto) {
        this.name = _data.name!;
        this.avatarUrl = _data.avatarAsset?.url ?? null;
        this.id = _data.id!;
    }
}

export class TeamMemberImpl {
    public id: string;
    public team: 'red' | 'blue';

    public get name(): string {
        return this.player!.profile!.name;
    }
    // TODO: implement this
    public get change(): number {
        return 0;
    }

    public playerId: string;
    public player!: PlayerImpl;

    public setPlayer(player: PlayerImpl): void {
        this.player = player;
        this.playerId = player.id;
    }

    public moves!: MatchMoveImpl[];

    public setMoves(moves: MatchMoveImpl[]): void {
        this.moves = moves;
    }

    public get avatarUrl(): string | null {
        return this.player.profile.avatarUrl;
    }

    constructor(_data: Components.Schemas.TeamMemberDto) {
        this.id = _data.id!;
        this.team = _data.teamId as 'red' | 'blue';

        this.playerId = _data.playerId!;
    }

    public get points(): number {
        return (
            this.moves.reduce(
                (sum, i) => sum + i.count * i.move!.pointsForScorer,
                0
            ) ?? 0
        );
    }
    public toJSON(): TeamMember {
        return {
            id: this.id,
            change: this.change,
            moves: this.moves.map((i) => i.toJSON()),
            name: this.name,
            points: this.points,
            team: this.team,
            avatarUrl: this.avatarUrl,
        };
    }
}

export class PlayerImpl {
    public id: string;

    public profileId: string;
    public profile: ProfileImpl;

    public setProfile(profile: ProfileImpl): void {
        this.profile = profile;
        this.profileId = profile.id;
    }

    constructor(_data: Components.Schemas.PlayerDto) {
        this.id = _data.id!;

        this.profileId = _data.profile!.id!;
        this.profile = new ProfileImpl(_data.profile!);
    }
}

export class TeamImpl {
    public id: string;
    public matchId: string;

    public members!: TeamMemberImpl[];

    public setMembers(members: TeamMemberImpl[]): void {
        this.members = members;
    }

    public get points(): number | null {
        return this.members.reduce((sum, i) => sum + (i.points ?? 0), 0) ?? 0;
    }

    constructor(_data: Components.Schemas.TeamDto) {
        this.id = _data.id!;
        this.matchId = _data.matchId!;
    }
}

export class MatchImpl {
    public id: string;
    public date: Date;

    public teams: TeamImpl[];

    public get _blueTeam(): TeamImpl {
        return this.teams[0];
    }
    public get _redTeam(): TeamImpl {
        return this.teams[1];
    }

    private get players(): TeamMemberImpl[] {
        return this.blueTeam.concat(this.redTeam);
    }
    private get matchMoves(): MatchMoveImpl[] {
        return this.players.flatMap((i) => i.moves);
    }
    private get finishMoves(): MatchMoveImpl[] {
        return this.matchMoves.filter((i) => i.isFinish);
    }

    private get winnerPlayer(): TeamMemberImpl | null {
        return (
            this.players.find(
                (i) => i.id === this.finishMoves[0]?.teamMemberId
            ) ?? null
        );
    }

    private get winnerTeam(): TeamImpl | null {
        return (
            this.teams.find((i) =>
                i.members.find((j) => j.id === this.winnerPlayer?.id)
            ) ?? null
        );
    }

    constructor(
        _data: Components.Schemas.MatchDto,
        _players: Components.Schemas.PlayerDto[],
        _ruleMoves: Components.Schemas.RuleMoveDto[]
    ) {
        if (_data.teams?.length !== 2) {
            throw new Error(
                `MatchImpl: expected MatchDto.teams.length to be exactly 2, but reveived ${_data.teams?.length}`
            );
        }

        this.id = _data.id!;
        this.date = new Date(_data.date!);
        this.teams = _data.teams!.map((i) => new TeamImpl(i));

        const players = _players.map((i) => new PlayerImpl(i));
        const ruleMoves = _ruleMoves.map((i) => new RuleMoveImpl(i));

        const matchMoves = _data.matchMoves!.map((i) => new MatchMoveImpl(i));

        for (const matchMove of matchMoves) {
            matchMove.setRuleMove(
                ruleMoves.find((i) => i.id === matchMove.moveId)!
            );
        }

        for (const team of this.teams) {
            const members = _data.teamMembers!.filter(
                (i) => i.teamId === team.id
            );
            team.setMembers(members.map((i) => new TeamMemberImpl(i)));

            for (const member of team.members!) {
                member.setPlayer(
                    players.find((i) => i.id === member.playerId)!
                );

                member.setMoves(
                    matchMoves.filter((i) => i.teamMemberId === member.id)
                );
            }
        }
    }
    public get redCups(): number {
        return this._redTeam.points!;
    }
    public get blueCups(): number {
        return this._blueTeam.points!;
    }

    public get blueTeam(): TeamMemberImpl[] {
        return this._blueTeam.members ?? [];
    }
    public get redTeam(): TeamMemberImpl[] {
        return this._redTeam.members ?? [];
    }

    public toJSON(): Match {
        return {
            id: this.id,
            date: this.date,

            blueCups: this.blueCups,
            redCups: this.redCups,

            blueTeam: this.blueTeam.map((i) => i.toJSON()),
            redTeam: this.redTeam.map((i) => i.toJSON()),

            winnerTeamId: this.winnerTeam?.id ?? null,
        };
    }
}
