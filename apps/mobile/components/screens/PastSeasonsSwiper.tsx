import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import ErrorScreen from '@/components/ErrorScreen';
import Leaderboard from '@/components/Leaderboard';
import LoadingScreen from '@/components/LoadingScreen';
import { PastSeasonsEmptyScreen } from '@/components/screens/PastSeasonsEmptyScreen';
import { usePastSeasonCardStyle } from '@/components/screens/usePastSeasonCardStyle';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useScopePicker } from '@/zustand/useScopePicker';

export function PastSeasonsSwiper() {
    const scopePicker = useScopePicker();

    const swiper = useControlledSwiper(scopePicker.pastSeasonsSwiperProgress);

    const nav = useNavigation();

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const cardStyle = usePastSeasonCardStyle();

    function onPlayerPress(id: string) {
        nav.navigate('player', { id });
    }

    if (seasonsQuery.isLoading) return <LoadingScreen />;
    if (seasonsQuery.error) return <ErrorScreen error={seasonsQuery.error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} lazyWindow={1}>
            {seasons.map((season) => {
                const rankingAlgorithm =
                    scopePicker.rankingAlgorithm ??
                    season.seasonSettings?.rankingAlgorithm ??
                    'ELO';

                return (
                    <Leaderboard
                        key={season.id}
                        style={cardStyle}
                        contentContainerStyle={{ paddingBottom: 16 }}
                        players={season.players}
                        showUnranked={false}
                        season={{
                            name: season.name!,
                            startDate: season.startDate!,
                            endDate: season.endDate!,
                            numPlayers: season.players.length,
                            numMatches: season.numMatches!,
                        }}
                        minMatchesRequiredToBeRanked={
                            season.seasonSettings?.minMatchesToQualify ?? 0
                        }
                        rankingAlgorithm={rankingAlgorithm}
                        onPlayerPress={onPlayerPress}
                    />
                );
            })}
        </Swiper>
    );
}
