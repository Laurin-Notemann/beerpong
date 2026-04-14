/* eslint @typescript-eslint/explicit-function-return-type: ["error"] */
import { profile } from '@expo/fingerprint/build/utils/Profile';

import { getAssetUrl } from '@/api/utils/assetUrl';
import { Match, PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';
import { Components } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';

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
        this.avatarUrl = getAssetUrl(_data.assetIdAvatar);
        this.id = _data.id!;
    }
}

export class TeamMemberImpl {
    public id: string;
    public team!: 'red' | 'blue';

    public get name(): string {
        return this.player?.profile?.name;
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
    public setRuleMoves(ruleMoves: RuleMoveImpl[]): void {
        this.moves = ruleMoves.map((i) => {
            const existing = this.moves.find((j) => j.moveId === i.id);

            if (existing) {
                return existing;
            }

            const move = new MatchMoveImpl({
                moveId: i.id,
                value: 0,
                teamMemberId: this.id,
            });
            move.setRuleMove(i);

            return move;
        });
    }

    public get avatarUrl(): string | null {
        return this.player?.profile?.avatarUrl;
    }

    public setTeamColor(color: 'red' | 'blue'): void {
        this.team = color;
    }

    constructor(_data: Components.Schemas.TeamMemberDto) {
        this.id = _data.id!;

        this.playerId = _data.playerId!;
    }

    /**
     * doesn't include points from team moves like finishes!
     */
    public get pointsScoredThemselves(): number {
        return (
            this.moves.reduce(
                (sum, i) => sum + i.count * i.move!.pointsForScorer,
                0
            ) ?? 0
        );
    }
    public get cups(): number {
        return this.moves.reduce((sum, i) => sum + i.count, 0);
    }

    public toJSON(): TeamMember {
        return {
            id: this.playerId,
            playerId: this.player?.id!,
            profileId: this.player?.profileId!,
            change: this.change,
            moves: this.moves.map((i) => i.toJSON()),
            name: this.name,
            points: this.pointsScoredThemselves,
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

    constructor(
        _data: Components.Schemas.PlayerDto,
        _p: Components.Schemas.ProfileDto
    ) {
        this.id = _data.id!;

        this.profileId = _p.id!;
        this.profile = new ProfileImpl(_p);
    }
}

export class TeamImpl {
    public id: string;
    public matchId: string;

    public members!: TeamMemberImpl[];

    public setMembers(members: TeamMemberImpl[]): void {
        this.members = members;
    }

    public get cups(): number | null {
        return this.members.reduce((sum, i) => sum + (i.cups ?? 0), 0) ?? 0;
    }

    constructor(_data: Components.Schemas.TeamDto) {
        this.id = _data.id!;
        this.matchId = _data.matchId!;
    }
}

export class MatchImpl {
    public id: string;
    public date: Date;
    public seasonId: string;
    public blueTeamPhotoUrl?: string | null;
    public redTeamPhotoUrl?: string | null;

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

    private ruleMoves: RuleMoveImpl[];

    constructor(
        _data: Omit<Components.Schemas.MatchDtoExtended, 'date'> & {
            date?: string | Date;
        },
        _players: Components.Schemas.PlayerDto[],
        _profiles: Components.Schemas.ProfileDto[],
        _ruleMoves: Components.Schemas.RuleMoveDto[]
    ) {
        if (_data.teams?.length !== 2) {
            throw new Error(
                `MatchImpl: expected MatchDto.teams.length to be exactly 2, but reveived ${_data.teams?.length}`
            );
        }

        this.seasonId = _data.seasonId!;
        this.id = _data.id!;
        this.date = new Date(_data.date!);
        this.teams = _data.teams!.map((i) => new TeamImpl(i));
        this.blueTeamPhotoUrl = getAssetUrl(_data.teams[0]?.photoAssetId);
        this.redTeamPhotoUrl = getAssetUrl(_data.teams[1]?.photoAssetId);

        const players = _players.map(
            (i) =>
                new PlayerImpl(
                    i,
                    _profiles.find((value) => value.id === i.profileId)!
                )
        );
        const ruleMoves = _ruleMoves.map((i) => new RuleMoveImpl(i));

        this.ruleMoves = ruleMoves;

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
                const player = players.find((i) => i.id === member.playerId);

                if (!player) {
                    // this has been observed in the wild: https://sackverein.sentry.io/issues/41383161/?project=4508333445152848&query=is%3Aunresolved%20issue.priority%3A%5Bhigh%2C%20medium%5D&referrer=issue-stream&stream_index=0
                    ConsoleLogger.error(
                        `MatchImpl failed to resolve profile with id "$${member.playerId}" for match`,
                        JSON.stringify({ _data, _players }, null, 2)
                    );
                }
                if (player) member.setPlayer(player);

                member.setMoves(
                    matchMoves.filter((i) => i.teamMemberId === member.id)
                );
                member.setRuleMoves(ruleMoves);
            }
        }
        for (const player of this._blueTeam.members) {
            player.setTeamColor('blue');
        }
        for (const player of this._redTeam.members) {
            player.setTeamColor('red');
        }
    }
    public get redCups(): number {
        return this._redTeam.cups!;
    }
    public get blueCups(): number {
        return this._blueTeam.cups!;
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
            seasonId: this.seasonId,
            date: this.date,

            blueCups: this.blueCups,
            redCups: this.redCups,
            blueTeamId: this._blueTeam.id,
            redTeamId: this._redTeam.id,
            blueTeamPhotoUrl: this.blueTeamPhotoUrl,
            redTeamPhotoUrl: this.redTeamPhotoUrl,

            blueTeam: this.blueTeam.map((i) => {
                const player = i.toJSON();

                const teamMoves = this.blueTeam.reduce<(typeof i)['moves']>(
                    (sum, j) => sum.concat(j.moves),
                    []
                );
                const pointsForTeamMoves = teamMoves.reduce((sum, j) => {
                    const pointsForMove =
                        this.ruleMoves.find((k) => k.id === j.moveId)
                            ?.pointsForTeam ?? 0;

                    return sum + pointsForMove * j.count;
                }, 0);
                player.points += pointsForTeamMoves;

                return player;
            }),
            redTeam: this.redTeam.map((i) => {
                const player = i.toJSON();

                const teamMoves = this.redTeam.reduce<(typeof i)['moves']>(
                    (sum, j) => sum.concat(j.moves),
                    []
                );
                const pointsForTeamMoves = teamMoves.reduce((sum, j) => {
                    const pointsForMove =
                        this.ruleMoves.find((k) => k.id === j.moveId)
                            ?.pointsForTeam ?? 0;

                    return sum + pointsForMove * j.count;
                }, 0);
                player.points += pointsForTeamMoves;

                return player;
            }),

            winnerTeamId: this.winnerTeam?.id ?? null,
        };
    }
}
