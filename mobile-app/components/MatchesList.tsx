import React, { useCallback } from 'react';
import { FlatList, FlatListProps } from 'react-native';

import { groupMatchesByDay } from '@/api/utils/groupMatchesByDay';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import { MatchesListItem } from '@/components/MatchesListItem';
import MenuSection from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';

export interface MatchesListProps
    extends Omit<
        FlatListProps<{
            matches: Match[];
            title: string;
            date: Date;
        }>,
        'data' | 'renderItem'
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

    background?: boolean;
}
export default function MatchesList({
    matches,
    refresh,
    forPlayer,
    onMatchPress,

    background,

    ...rest
}: MatchesListProps) {
    const days = groupMatchesByDay(matches);

    const handleMatchPress = useCallback(
        (match: Match) => onMatchPress(match),
        [onMatchPress]
    );

    return (
        <FlatList
            ListEmptyComponent={<NoMatchesPlayedYet />}
            {...rest}
            contentContainerStyle={[
                { paddingBottom: 32 },
                rest.contentContainerStyle,
            ]}
            style={[
                {
                    alignSelf: 'stretch',
                    paddingHorizontal: 16,
                },
                rest.style,
            ]}
            data={days}
            keyExtractor={(item) => item.date.toISOString()}
            initialNumToRender={1}
            maxToRenderPerBatch={3}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
            refreshControl={<RefreshControl {...refresh} />}
            renderItem={({ item, index }) => (
                <MenuSection
                    key={index}
                    title={item.title}
                    containerStyle={{ marginHorizontal: forPlayer ? 8 : 0 }}
                    background={background}
                >
                    {item.matches.map((match, idx) => (
                        <MatchesListItem
                            border={idx !== 0}
                            key={match.id}
                            match={match}
                            onPress={() => handleMatchPress(match)}
                            highlightedId={forPlayer?.profileId}
                        />
                    ))}
                </MenuSection>
            )}
        />
    );
}
