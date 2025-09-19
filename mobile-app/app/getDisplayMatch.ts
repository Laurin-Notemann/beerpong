import {
    getInfluenceOfMatchOnAveragePoints,
    MinimalMatch,
    TeamMember,
} from '@/api/utils/matchDtoToMatch';
import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { PlayerDto, RuleMoveDto } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';
import { PlayerDraft } from '@/zustand/matchEditDraftStore';

export function getDisplayMatch(
    draftPlayers: (PlayerDraft & { team: TeamId })[],
    rankingAlgorithm: 'AVERAGE' | 'ELO' | undefined,
    profiles: PlayerDto[],
    matches: MinimalMatch[],
    allowedMoves: RuleMoveDto[]
): Omit<MinimalMatch, 'id' | 'date'> {
    const teamMembers = draftPlayers.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.playerId === j.id);

        if (!profile?.profile?.name) {
            ConsoleLogger.error('failed to get profile for team member'); // TODO: this happens sometimes for a split second
        }

        const ownTeam = draftPlayers.filter((j) => j.team === i.team);

        const pointsForOwnMoves = i.moves.reduce(
            (sum, j) =>
                sum +
                j.count *
                    (allowedMoves.find((k) => k.id === j.moveId)
                        ?.pointsForScorer ?? 0),
            0
        );
        const teamMoves = ownTeam.reduce<(typeof i)['moves']>(
            (sum, j) => sum.concat(j.moves),
            []
        );
        const pointsForTeamMoves = teamMoves.reduce((sum, j) => {
            const pointsForMove =
                allowedMoves.find((k) => k.id === j.moveId)?.pointsForTeam ?? 0;

            return sum + pointsForMove * j.count;
        }, 0);
        const points = pointsForOwnMoves + pointsForTeamMoves;

        return {
            id: i.playerId,
            team: i.team,
            points,
            change: 0, // we set this later, can't set it here bc we need matchObj to calculate it which requires teamMembers 🙃
            moves: allowedMoves.map((j) => {
                return {
                    id: j.id!,
                    count: i.moves.find((k) => k.moveId === j.id)?.count ?? 0,
                    title: j.name || 'Unknown',
                    points: j.pointsForScorer!,
                    pointsForTeam: j.pointsForTeam!,
                    isFinish: j.finishingMove!,
                };
            }),

            avatarUrl: profile?.profile?.avatarAsset?.url,
            name: profile?.profile?.name || 'Unknown',
            profileId: profile?.id || '#',
        };
    });
    const displayMatch: MinimalMatch = {
        id: 'virtual:match',
        date: new Date(), // TODO: footgun: match.date is actually important here, because getInfluenceOfMatchOnAveragePoints sorts by it!
        blueCups: teamMembers
            .filter((i) => i.team === 'blue')
            .map((i) => i.moves)
            .flat()
            .reduce((sum, i) => sum + i.count, 0),
        redCups: teamMembers
            .filter((i) => i.team === 'red')
            .map((i) => i.moves)
            .flat()
            .reduce((sum, i) => sum + i.count, 0),
        redTeam: teamMembers.filter((i) => i.team === 'red'),
        blueTeam: teamMembers.filter((i) => i.team === 'blue'),
    };

    const isNewMatch = !matches.find((i) => i.id === displayMatch.id);

    const matchesIncludingDisplay = isNewMatch
        ? matches.concat([displayMatch])
        : matches.map((i) =>
              i.id === displayMatch.id ? { ...displayMatch, date: i.date } : i
          );

    for (const i of teamMembers) {
        i.change = getInfluenceOfMatchOnAveragePoints(
            matchesIncludingDisplay,
            i.id,
            displayMatch.id,
            rankingAlgorithm
        );
    }
    // TODO: maybe this could come in useful here in the future? new MatchImpl(displayMatch, profiles, allowedMoves).toJSON();

    return displayMatch;
}
