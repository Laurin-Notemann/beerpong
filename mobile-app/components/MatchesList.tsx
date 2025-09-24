import { FlashList, FlashListProps } from '@shopify/flash-list';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import { groupMatchesByDay } from '@/api/utils/groupMatchesByDay';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import { MatchesListItem } from '@/components/MatchesListItem';
import { Heading } from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';

export interface MatchesListProps
    extends Omit<FlashListProps<MatchesListRow>, 'data' | 'renderItem'> {
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

    background?: boolean;
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

    background,

    ...rest
}: MatchesListProps) {
    const days = groupMatchesByDay(matches);

    const rows: MatchesListRow[] = useMemo(() => {
        const out: MatchesListRow[] = [];
        for (const day of days) {
            out.push({ type: 'header', title: day.title, date: day.date });
            day.matches.forEach((m, idx) => {
                out.push({ type: 'match', match: m, isFirstOfDay: idx === 0 });
            });
        }
        return out;
    }, [days]);

    const handleMatchPress = useCallback(
        (match: Match) => onMatchPress(match),
        [onMatchPress]
    );

    const {
        style: restStyle,
        contentContainerStyle: restContentContainerStyle,
        ...listProps
    } = rest as any;

    const containerStyle = StyleSheet.flatten([
        { paddingBottom: 32 },
        restContentContainerStyle,
    ]) as ViewStyle | undefined;
    const listStyle = StyleSheet.flatten([
        {
            alignSelf: 'stretch',
            paddingHorizontal: 16,
        },
        restStyle,
    ]) as ViewStyle | undefined;

    return (
        <FlashList<MatchesListRow>
            ListEmptyComponent={<NoMatchesPlayedYet />}
            {...listProps}
            contentContainerStyle={containerStyle as any}
            style={listStyle as any}
            data={rows}
            keyExtractor={(item) =>
                item.type === 'header'
                    ? `${item.date.toISOString()}-header`
                    : item.match.id
            }
            getItemType={(item) => item.type}
            refreshControl={<RefreshControl {...refresh} />}
            renderItem={({ item }) => {
                if (item.type === 'header') {
                    return <Heading title={item.title} border={false} />;
                }
                return (
                    <MatchesListItem
                        border={!item.isFirstOfDay}
                        match={item.match}
                        onPress={() => handleMatchPress(item.match)}
                        highlightedId={forPlayer?.profileId}
                    />
                );
            }}
        />
    );
}
