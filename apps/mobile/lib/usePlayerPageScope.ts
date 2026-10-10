import {
    Player,
    useAllSeasonsQuery,
    useGroup,
    useSeasonSettings,
} from '@/api/calls/seasonHooks';
import {
    useSeasonLeaderboards,
    useSeasonMatches,
} from '@/api/calls/seasonMatchesHooks';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { Match, wonMatch } from '@/api/utils/matchDtoToMatch';
import { countCups } from '@/api/utils/ruleMoveCups';
import { ScopeInfo } from '@/components/screens/Player';
import { rankPlayers } from '@/constants/rankingAlgorithms';
import { eloAlgorithm } from '@/lib/EloAlgorithm';
import { SeasonSettingsDto } from '@/openapi/openapi';
import { getWakeTimeDayStart } from '@/utils/wakeTime';

// TODO: minMatchesRequiredToBeRanked, placement, elo, points, rankingAlgorithm

const playedIn = (profileId: string) => (match: Match) =>
    match.blueTeam.concat(match.redTeam).some((i) => i.profileId === profileId);

/**
 * The player page: the player (`playerId` is from any season) and their stats per scope.
 * Loads every season of the group, all of which the page shows.
 */
export function usePlayerPageScope(playerId: string) {
    const { groupId, seasonId, activeSeason: groupActiveSeason } = useGroup();

    const { alltimePlayers, dailyPlayers } = useLeaderboardProps(
        groupId,
        seasonId!
    );

    const seasonsQuery = useAllSeasonsQuery(groupId);
    const seasons = seasonsQuery.data?.data ?? [];
    const seasonIds = seasons.map((i) => i.id);

    const seasonMatches = useSeasonMatches(groupId, seasonIds);
    const { leaderboardBySeason } = useSeasonLeaderboards(groupId, seasonIds);

    // with deleted players, so a past season's player has a page too
    const player = [...seasonMatches.playersBySeason.values()]
        .flat()
        .find((i) => i.id === playerId);
    const profileId = player?.profileId ?? '';

    const matchesOf = (id: string | undefined) =>
        (id ? seasonMatches.matchesBySeason.get(id) : undefined)?.filter(
            playedIn(profileId)
        ) ?? [];

    const currentSeasonMatches = matchesOf(
        seasons.find((i) => i.endDate == null)?.id
    );

    const { seasonSettings } = useSeasonSettings(groupId!, seasonId!);

    const todayStart = getWakeTimeDayStart(
        // oxlint-disable-next-line react/purity -- today is read on each render, so it moves on after midnight
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

    const allTimeMatches = seasons.flatMap((i) => matchesOf(i.id));

    const scopes = new Map<string, ScopeInfo>();
    for (const season of seasons) {
        scopes.set(
            season.id,
            getScope(
                profileId,
                matchesOf(season.id),
                season.seasonSettings,
                leaderboardBySeason.get(season.id) ?? [],
                season.name || 'Unknown'
            )
        );
    }

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

    return {
        player,
        scopes,
        isLoading: seasonsQuery.isLoading || seasonMatches.isLoading,
    };
}

const getMatchesWon = (profileId: string | undefined, matches: Match[]) =>
    matches.filter((i) => wonMatch(profileId, i)).length;
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
    seasonSettings: SeasonSettingsDto | null | undefined,
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
