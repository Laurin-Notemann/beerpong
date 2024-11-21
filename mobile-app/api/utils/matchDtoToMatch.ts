import { Match } from '@/components/MatchesList';
import { Components } from '@/openapi/openapi';

export const matchDtoToMatch =
    (
        players: Components.Schemas.PlayerDto[] = [],
        allowedMoves: Components.Schemas.RuleMoveDto[] = []
    ) =>
    (i: Components.Schemas.MatchDto): Match => {
        const [blueTeam, redTeam] = i.teams ?? [];

        // TODO: respect pointsForTeam

        const bluePlayers =
            i.teamMembers
                ?.filter((i) => i.teamId === blueTeam.id)
                .map((i) => ({
                    ...(players.find((j) => j.id === i.playerId!)?.profile ??
                        {}),
                    ...i,
                    id: players.find((j) => j.id === i.playerId!)?.id!,
                })) ?? [];
        const redPlayers =
            i.teamMembers
                ?.filter((i) => i.teamId === redTeam.id)
                .map((i) => ({
                    ...(players.find((j) => j.id === i.playerId!)?.profile ??
                        {}),
                    ...i,
                    id: players.find((j) => j.id === i.playerId!)?.id!,
                })) ?? [];

        const matchMovesByTeamMember =
            i.matchMoves?.reduce<Record<string, any[]>>((obj, i) => {
                if (!obj[i.teamMemberId!]) {
                    obj[i.teamMemberId!] = [];
                }
                obj[i.teamMemberId!].push(i);

                return obj;
            }, {}) ?? {};

        const blueCups = i
            .matchMoves!.filter((j) => {
                const player = i.teamMembers!.find(
                    (k) => j.teamMemberId === k.id
                );
                return player?.teamId === blueTeam.id;
            })
            // value is the amount of times the move has been performed by the player
            .reduce((sum, j) => sum + j.value!, 0);

        const redCups = i
            .matchMoves!.filter((j) => {
                const player = i.teamMembers!.find(
                    (k) => j.teamMemberId === k.id!
                );
                return player?.teamId === redTeam.id;
            })
            // value is the amount of times the move has been performed by the player
            .reduce((sum, j) => sum + j.value!, 0);

        return {
            id: i.id!,
            blueCups,
            redCups,
            date: new Date(i.date!),
            redTeam: redPlayers.map((j) => {
                const teamMember = i.teamMembers?.find(
                    (k) => k.playerId === j.id
                )!;

                const moves = allowedMoves.map((k) => {
                    return {
                        id: k.id!,
                        count:
                            matchMovesByTeamMember[teamMember.id!]?.find(
                                (l) => l.moveId === k.id
                            )?.value ?? 0,
                        title: k.name || 'Unknown',
                        points: k.pointsForScorer!,
                        pointsForTeam: k.pointsForTeam!,
                        isFinish: k.finishingMove!,
                    };
                });

                return {
                    id: j.id!,
                    name: j.name!,
                    avatarUrl: j.avatarAsset?.url,
                    moves,
                    points: moves.reduce(
                        (sum, k) => sum + k.points * k.count,
                        0
                    ),
                    change: 0.1,
                    team: 'red' as const,
                };
            }),
            blueTeam: bluePlayers.map((j) => {
                const teamMember = i.teamMembers?.find(
                    (k) => k.playerId === j.id
                )!;

                const moves = allowedMoves.map((k) => {
                    return {
                        id: k.id!,
                        count:
                            matchMovesByTeamMember[teamMember.id!]?.find(
                                (l) => l.moveId === k.id
                            )?.value ?? 0,
                        title: k.name || 'Unknown',
                        points: k.pointsForScorer!,
                        pointsForTeam: k.pointsForTeam!,
                        isFinish: k.finishingMove!,
                    };
                });

                return {
                    id: j.id!,
                    name: j.name!,
                    avatarUrl: j.avatarAsset?.url,
                    moves,
                    points: moves.reduce(
                        (sum, k) => sum + k.points * k.count,
                        0
                    ),
                    change: 0.1,
                    team: 'blue' as const,
                };
            }),
        };
    };
