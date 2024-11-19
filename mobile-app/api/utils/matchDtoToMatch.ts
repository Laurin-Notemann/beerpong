import { Match } from '@/components/MatchesList';
import { Components } from '@/openapi/openapi';

export const matchDtoToMatch =
    (players: Components.Schemas.PlayerDto[] = []) =>
    (i: Components.Schemas.MatchDto): Match => {
        const [blueTeam, redTeam] = i.teams ?? [];

        const bluePlayers = i
            .teamMembers!.filter((i) => i.teamId === blueTeam.id)
            .map((i) => ({
                ...i,
                ...(players.find((j) => j.id === i.playerId!)?.profile ?? {}),
            }));
        const redPlayers = i
            .teamMembers!.filter((i) => i.teamId === redTeam.id)
            .map((i) => ({
                ...i,
                ...(players.find((j) => j.id === i.playerId!)?.profile ?? {}),
            }));

        const matchMovesByTeamMember = i.matchMoves!.reduce<
            Record<string, any[]>
        >((obj, i) => {
            if (!obj[i.teamMemberId!]) {
                obj[i.teamMemberId!] = [];
            }
            obj[i.teamMemberId!].push();

            return obj;
        }, {});

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
                    (k) => j.teamMemberId === k.id
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
            redTeam: redPlayers.map((i) => ({
                id: i.id!,
                name: i.name!,
                avatarUrl: i.avatarAsset?.url,
            })),
            blueTeam: bluePlayers.map((i) => ({
                id: i.id!,
                name: i.name!,
                avatarUrl: i.avatarAsset?.url,
            })),
        };
    };
