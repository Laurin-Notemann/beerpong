import { LegendList, LegendListProps } from '@legendapp/list/react-native';
import React, { useMemo } from 'react';

import { groupMatchesByDay } from '@/api/utils/groupMatchesByDay';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import { MatchesListItem } from '@/components/MatchesListItem';
import { Heading } from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';

export interface MatchesListProps extends Pick<
    LegendListProps<MatchesListRow>,
    | 'style'
    | 'contentContainerStyle'
    | 'ListHeaderComponent'
    | 'ListEmptyComponent'
> {
    refresh: RefreshProps;
    matches: Match[];

    /**
     * if provided:
     * - filter out matches not played by this player
     * - display whether the player was on the winning team
     * - display the influence of the match on the player's ranking
     */
    forPlayer?: {
        profileId: string;
    };
    onMatchPress: (match: Match) => void;
}
type MatchesListRow =
    | {
          type: 'header';
          title: string;
          date: Date;
      }
    | {
          type: 'match';
          match: Match;
          isFirstOfDay: boolean;
      };

export default function MatchesList({
    matches,
    refresh,
    forPlayer,
    onMatchPress,

    style,
    contentContainerStyle,
    ListEmptyComponent = <NoMatchesPlayedYet />,
    ...rest
}: MatchesListProps) {
    // flat rows with a header row per day, so the day separators scroll with the matches
    const rows = useMemo(() => {
        const out: MatchesListRow[] = [];
        for (const day of groupMatchesByDay(matches)) {
            out.push({ type: 'header', title: day.title, date: day.date });
            day.matches.forEach((m, idx) => {
                out.push({ type: 'match', match: m, isFirstOfDay: idx === 0 });
            });
        }
        return out;
    }, [matches]);

    return (
        <LegendList
            {...rest}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={[
                { paddingBottom: 32 },
                contentContainerStyle,
            ]}
            style={[{ alignSelf: 'stretch', paddingHorizontal: 16 }, style]}
            data={rows}
            keyExtractor={(item) =>
                item.type === 'header'
                    ? `${item.date.toISOString()}-header`
                    : item.match.id
            }
            getItemType={(item) => item.type}
            estimatedItemSize={72}
            recycleItems
            // rows only re-render when data or extraData change
            extraData={forPlayer?.profileId}
            refreshControl={<RefreshControl {...refresh} />}
            renderItem={({ item }) => {
                if (item.type === 'header') {
                    return <Heading title={item.title} border={false} />;
                }
                return (
                    <MatchesListItem
                        border={!item.isFirstOfDay}
                        match={item.match}
                        onPress={() => onMatchPress(item.match)}
                        highlightedId={forPlayer?.profileId}
                    />
                );
            }}
        />
    );
}
