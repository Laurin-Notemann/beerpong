import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { HeaderTitle } from '@/components/HeaderTitle';
import { SwipeChildren } from '@/components/SwipeChildren';
import { useScopePicker } from '@/zustand/useScopePicker';

export function ScopePickerHeaderTitle() {
    const scopePicker = useScopePicker();

    const { groupId, activeSeason } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons = getPastSeasons(seasonsQuery.data?.data);

    const groupHasPastSeasons = pastSeasons.length > 0;

    if (scopePicker.isPastSeasonsMode)
        return (
            <SwipeChildren
                key="pastSeasons"
                progress={scopePicker.pastSeasonsSwiperProgress}
                right
            >
                {pastSeasons.map((i) => (
                    <HeaderTitle key={i.id} title={i.name || 'Unknown'} />
                ))}
            </SwipeChildren>
        );

    return (
        <SwipeChildren
            key="leaderboard"
            progress={scopePicker.leaderboardSwiperProgress}
            right
        >
            <HeaderTitle title="Today" />
            <HeaderTitle title={activeSeason?.name || 'This Season'} />
            {groupHasPastSeasons && <HeaderTitle title="All Time" />}
        </SwipeChildren>
    );
}
