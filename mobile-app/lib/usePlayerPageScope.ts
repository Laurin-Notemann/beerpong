import {
    Player,
    useAllSeasonsQuery,
    useGroup,
    useSeasonSettings,
} from '@/api/calls/seasonHooks';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { Match, matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { countCups } from '@/api/utils/ruleMoveCups';
import { ScopeInfo } from '@/components/screens/Player';
import { rankPlayers } from '@/constants/rankingAlgorithms';
import { eloAlgorithm } from '@/lib/EloAlgorithm';
import { SeasonSettingsDto } from '@/openapi/openapi';
import { getWakeTimeDayStart } from '@/utils/wakeTime';

// TODO: additional seasons
// TODO: minMatchesRequiredToBeRanked, placement, elo, points, rankingAlgorithm

export function usePlayerPageScope(profileId: string) {
    const { groupId, seasonId, activeSeason: groupActiveSeason } = useGroup();

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

    const todayStart = getWakeTimeDayStart(
        new Date(),
        seasonSettings?.wakeTime
    ).getTime();

    const todayMatches = currentSeasonMatches.filter(
        (i) =>
            getWakeTimeDayStart(
                new Date(i.date),
                seasonSettings?.wakeTime
            ).getTime() === todayStart
    );

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
            groupActiveSeason?.seasonSettings,
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
            groupActiveSeason?.seasonSettings,
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

        return sum + countCups(player.moves);
    }, 0);
};

const getAverageTeamSize = (
    profileId: string | undefined,
    matches: Match[]
) => {
    const sizes = matches.flatMap((i) =>
        [i.blueTeam, i.redTeam]
            .filter((team) => team.some((j) => j.profileId === profileId))
            .map((team) => team.length)
    );
    return sizes.length ? sizes.reduce((a, b) => a + b) / sizes.length : 1;
};

const getScope = (
    profileId: string | undefined,
    matches: Match[],
    seasonSettings: SeasonSettingsDto | undefined,
    seasonPlayers: Player[],
    name: string
): ScopeInfo => {
    const rankingAlgorithm = seasonSettings?.rankingAlgorithm;

    const ranked = rankPlayers(seasonPlayers, rankingAlgorithm).find(
        (i) => i.player.profileId === profileId
    );
    const placement = ranked?.placement ?? { rank: 0, tied: false };

    const player = ranked?.player;

    return {
        minMatchesRequiredToBeRanked: seasonSettings?.minMatchesToQualify ?? 0,
        placement,
        elo: player?.elo ?? eloAlgorithm.params.startingElo,
        matchesWon: getMatchesWon(profileId, matches),
        points: player?.points ?? 0,
        cups: getAllTimeCups(profileId, matches),
        avgTeamSize: getAverageTeamSize(profileId, matches),
        matches: matches,
        rankingAlgorithm: seasonSettings?.rankingAlgorithm ?? 'AVERAGE',
        isUnranked: matches.length < (seasonSettings?.minMatchesToQualify ?? 0),

        name,
    };
};
