import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import {
    byDescendingAveragePoints,
    byDescendingElo,
    useLeaderboardProps,
} from '@/api/propHooks/leaderboardPropHooks';
import { Match, matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { eloAlgorithm } from '@/app/EloAlgorithm';

// TODO: cutoff for today leaderboard
// TODO: additional seasons
// TODO: minMatchesRequiredToBeRanked, placement, elo, points, rankingAlgorithm

export function usePlayerPageScope(playerId: string) {
    const { groupId, seasonId, group } = useGroup();

    const { currentSeasonPlayers, rawCurrentSeasonPlayers } =
        useLeaderboardProps(groupId, seasonId!);

    const seasonsQuery = useAllSeasonsQuery(groupId);

    // TODO: this should only be the seasons where this specific player was active
    const activeSeason = seasonsQuery.data?.data?.find(
        (i) => i.endDate == null
    );

    const player = rawCurrentSeasonPlayers.find((i) => i.id === playerId);

    const sortedPlayers = currentSeasonPlayers.sort(
        group.data?.activeSeason?.seasonSettings?.rankingAlgorithm === 'AVERAGE'
            ? byDescendingAveragePoints
            : byDescendingElo
    );

    const placement = sortedPlayers.findIndex((i) => i.id === playerId) + 1;

    const minMatchesRequiredToBeRanked = 1;

    const currentSeasonMatches =
        activeSeason?.ruleMoves && activeSeason?.rawPlayers
            ? (activeSeason?.matches.map(
                  matchDtoToMatch(
                      activeSeason?.rawPlayers,
                      activeSeason?.ruleMoves
                  )
              ) ?? [])
            : [];

    const todayMatches = currentSeasonMatches;

    const allTimeMatches = (seasonsQuery.data?.data ?? []).flatMap((i) =>
        i.ruleMoves && i.rawPlayers
            ? i.matches.map(matchDtoToMatch(i.rawPlayers, i.ruleMoves))
            : []
    );

    const currentSeason = {
        minMatchesRequiredToBeRanked,
        placement,
        elo: player?.statistics?.elo ?? eloAlgorithm.params.startingElo,
        matchesWon: getMatchesWon(playerId, currentSeasonMatches),
        points: player?.statistics?.points ?? 0,
        cups: getAllTimeCups(playerId, currentSeasonMatches),
        matches: currentSeasonMatches,
        rankingAlgorithm:
            group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ??
            'AVERAGE',
    };
    const today = {
        minMatchesRequiredToBeRanked,
        placement,
        elo: player?.statistics?.elo ?? eloAlgorithm.params.startingElo,
        matchesWon: getMatchesWon(playerId, todayMatches),
        points: player?.statistics?.points ?? 0,
        cups: getAllTimeCups(playerId, todayMatches),
        matches: todayMatches,
        rankingAlgorithm:
            group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ??
            'AVERAGE',
    };
    const allTime = {
        minMatchesRequiredToBeRanked,
        placement,
        elo: player?.statistics?.elo ?? eloAlgorithm.params.startingElo,
        matchesWon: getMatchesWon(playerId, allTimeMatches),
        points: player?.statistics?.points ?? 0,
        cups: getAllTimeCups(playerId, allTimeMatches),
        matches: allTimeMatches,
        rankingAlgorithm:
            group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ??
            'AVERAGE',
    };
    return { currentSeason, today, allTime };
}

const getMatchesWon = (playerId: string, matches: Match[]) => {
    return matches.filter(
        (i) =>
            i.redTeam
                .concat(i.blueTeam)
                .find((j) => j.moves.some((k) => k.isFinish && k.count > 0))
                ?.team ===
            i.redTeam.concat(i.blueTeam).find((j) => j.id === playerId)?.team
    ).length;
};
const getAllTimeCups = (playerId: string, matches: Match[]) => {
    return matches.reduce((sum, i) => {
        const player = i.blueTeam
            .concat(i.redTeam)
            .find((i) => i.id === playerId);

        if (!player) return sum;

        return sum + player.moves.reduce((sum, i) => sum + i.count, 0);
    }, 0);
};
