import {
    Player,
    useAllSeasonsQuery,
    useGroup,
    useSeasonSettings,
} from '@/api/calls/seasonHooks';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { Match, matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { eloAlgorithm } from '@/app/EloAlgorithm';
import { ScopeInfo } from '@/components/screens/Player';
import { getRankingAlgorithm } from '@/constants/rankingAlgorithms';
import { SeasonSettings } from '@/openapi/openapi';

// TODO: additional seasons
// TODO: minMatchesRequiredToBeRanked, placement, elo, points, rankingAlgorithm

export function usePlayerPageScope(profileId: string) {
    const { groupId, seasonId, group } = useGroup();

    const { alltimePlayers, dailyPlayers } = useLeaderboardProps(
        groupId,
        seasonId!
    );

    const seasonsQuery = useAllSeasonsQuery(groupId);

    // TODO: this should only be the seasons where this specific player was active
    const activeSeason = seasonsQuery.data?.data?.find(
        (i) => i.endDate == null
    );
    const playerIds =
        seasonsQuery.data?.data?.flatMap((i) =>
            i.players.filter((j) => j.profileId === profileId).map((i) => i.id)
        ) ?? [];

    const currentSeasonMatches =
        activeSeason?.ruleMoves && activeSeason?.rawPlayers
            ? (activeSeason?.matches
                  .filter((i) =>
                      i.teamMembers!.find((j) =>
                          playerIds.includes(j.playerId!)
                      )
                  )
                  .map(
                      matchDtoToMatch(
                          activeSeason?.rawPlayers,
                          activeSeason?.ruleMoves
                      )
                  ) ?? [])
            : [];

    const { seasonSettings } = useSeasonSettings(groupId!, seasonId!);

    const todayMatches = currentSeasonMatches.filter((i) => {
        const wakeTime = seasonSettings?.wakeTimeHour ?? 0;

        const matchDate = new Date(i.date);
        const now = new Date();
        if (now.getHours() < wakeTime) {
            now.setDate(now.getDate() - 1);
        }
        now.setHours(wakeTime, 0, 0, 0);
        if (matchDate.getHours() < wakeTime) {
            matchDate.setDate(matchDate.getDate() - 1);
        }
        matchDate.setHours(wakeTime, 0, 0, 0);
        return matchDate.getTime() === now.getTime();
    });

    const allTimeMatches = (seasonsQuery.data?.data ?? []).flatMap((i) =>
        i.ruleMoves && i.rawPlayers
            ? i.matches
                  .filter((i) =>
                      i.teamMembers!.find((j) =>
                          playerIds.includes(j.playerId!)
                      )
                  )
                  .map(matchDtoToMatch(i.rawPlayers, i.ruleMoves))
            : []
    );

    const scopes = (seasonsQuery.data?.data ?? []).reduce<
        Map<string, ScopeInfo>
    >((obj, i) => {
        const seasonMatches =
            i?.ruleMoves && i?.rawPlayers
                ? (i?.matches
                      .filter((i) =>
                          i.teamMembers!.find((j) =>
                              playerIds.includes(j.playerId!)
                          )
                      )
                      .map(matchDtoToMatch(i?.rawPlayers, i?.ruleMoves)) ?? [])
                : [];

        obj.set(
            i.id!,
            getScope(
                profileId,
                seasonMatches,
                i.seasonSettings,
                i.players,
                i.name || 'Unknown'
            )
        );
        return obj;
    }, new Map());

    scopes.set(
        'today',
        getScope(
            profileId,
            todayMatches,
            group.data?.activeSeason?.seasonSettings,
            dailyPlayers,
            'Today'
        )
    );
    if (scopes.get(seasonId!)) scopes.set('season', scopes.get(seasonId!)!);
    scopes.set(
        'all-time',
        getScope(
            profileId,
            allTimeMatches,
            group.data?.activeSeason?.seasonSettings,
            alltimePlayers,
            'All Time'
        )
    );

    return { scopes };
}

const getMatchesWon = (profileId: string | undefined, matches: Match[]) => {
    return matches.filter(
        (i) =>
            i.redTeam
                .concat(i.blueTeam)
                .find((j) => j.moves.some((k) => k.isFinish && k.count > 0))
                ?.team ===
            i.redTeam.concat(i.blueTeam).find((j) => j.profileId === profileId)
                ?.team
    ).length;
};
const getAllTimeCups = (profileId: string | undefined, matches: Match[]) => {
    return matches.reduce((sum, i) => {
        const player = i.blueTeam
            .concat(i.redTeam)
            .find((i) => i.profileId === profileId);

        if (!player) return sum;

        return sum + player.moves.reduce((sum, i) => sum + i.count, 0);
    }, 0);
};

const getScope = (
    profileId: string | undefined,
    matches: Match[],
    seasonSettings: SeasonSettings | undefined,
    seasonPlayers: Player[],
    name: string
): ScopeInfo => {
    const rankingAlgorithm = seasonSettings?.rankingAlgorithm;

    const sortedPlayers = seasonPlayers.sort(
        getRankingAlgorithm(rankingAlgorithm).sortFunc
    );

    const placement =
        sortedPlayers.findIndex((i) => i.profileId === profileId) + 1;

    const player = sortedPlayers.find((i) => i.profileId === profileId);

    return {
        minMatchesRequiredToBeRanked: seasonSettings?.minMatchesToQualify ?? 0,
        placement,
        elo: player?.elo ?? eloAlgorithm.params.startingElo,
        matchesWon: getMatchesWon(profileId, matches),
        points: player?.points ?? 0,
        cups: getAllTimeCups(profileId, matches),
        matches: matches,
        rankingAlgorithm: seasonSettings?.rankingAlgorithm ?? 'AVERAGE',
        isUnranked: matches.length < (seasonSettings?.minMatchesToQualify ?? 0),

        name,
    };
};
