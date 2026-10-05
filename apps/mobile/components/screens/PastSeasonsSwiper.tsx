import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import {
    getPastSeasons,
    toPlayer,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import ErrorScreen from '@/components/ErrorScreen';
import Leaderboard from '@/components/Leaderboard';
import LoadingScreen from '@/components/LoadingScreen';
import { PastSeasonsEmptyScreen } from '@/components/screens/PastSeasonsEmptyScreen';
import { usePastSeasonCardStyle } from '@/components/screens/usePastSeasonCardStyle';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { SeasonListDto } from '@/openapi/openapi';
import { useScopePicker } from '@/zustand/useScopePicker';

export function PastSeasonsSwiper() {
    const scopePicker = useScopePicker();

    const swiper = useControlledSwiper(scopePicker.pastSeasonsSwiperProgress);

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons = getPastSeasons(seasonsQuery.data?.data);

    if (seasonsQuery.isLoading) return <LoadingScreen />;
    if (seasonsQuery.error) return <ErrorScreen error={seasonsQuery.error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} lazyWindow={1}>
            {seasons.map((season) => (
                <PastSeasonLeaderboard key={season.id} season={season} />
            ))}
        </Swiper>
    );
}

/** One past season's leaderboard; it loads when the pager mounts its page. */
function PastSeasonLeaderboard({ season }: { season: SeasonListDto }) {
    const scopePicker = useScopePicker();

    const nav = useNavigation();

    const { groupId } = useGroup();

    const leaderboardQuery = useGetLeaderboardQuery(
        groupId,
        season.id,
        LeaderboardScope.SEASON
    );

    const cardStyle = usePastSeasonCardStyle();

    const players = leaderboardQuery.data?.data?.entries?.map(toPlayer) ?? [];

    const rankingAlgorithm =
        scopePicker.rankingAlgorithm ??
        season.seasonSettings?.rankingAlgorithm ??
        'ELO';

    function onPlayerPress(id: string) {
        nav.navigate('player', { id });
    }

    return (
        <Leaderboard
            style={cardStyle}
            contentContainerStyle={{ paddingBottom: 16 }}
            players={players}
            showUnranked={false}
            season={{
                name: season.name!,
                startDate: season.startDate!,
                endDate: season.endDate!,
                numPlayers: players.length,
                numMatches:
                    season.numMatches ??
                    leaderboardQuery.data?.data?.numMatches ??
                    0,
            }}
            minMatchesRequiredToBeRanked={
                season.seasonSettings?.minMatchesToQualify ?? 0
            }
            rankingAlgorithm={rankingAlgorithm}
            onPlayerPress={onPlayerPress}
        />
    );
}
