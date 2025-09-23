import { FlashList, FlashListProps } from '@shopify/flash-list';
import React, { useCallback } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import { groupMatchesByDay } from '@/api/utils/groupMatchesByDay';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import { MatchesListItem } from '@/components/MatchesListItem';
import MenuSection from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';

export interface MatchesListProps
    extends Omit<
        FlashListProps<{
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
        <FlashList<{ matches: Match[]; title: string; date: Date }>
            ListEmptyComponent={<NoMatchesPlayedYet />}
            {...listProps}
            contentContainerStyle={containerStyle as any}
            style={listStyle as any}
            data={days}
            keyExtractor={(item) => item.date.toISOString()}
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
