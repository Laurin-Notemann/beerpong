import React from 'react';
import { FlatList, FlatListProps } from 'react-native';

import { groupMatchesByDay } from '@/api/utils/groupMatchesByDay';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { useNavigation } from '@/app/navigation/useNavigation';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import { MatchesListItem } from '@/components/MatchesListItem';
import MenuSection from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';
import { useTheme } from '@/theme';

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
        id: string;
    };
}
export default function MatchesList({
    matches,
    refresh,
    forPlayer,

    ...rest
}: MatchesListProps) {
    const nav = useNavigation();
    const theme = useTheme();

    const days = groupMatchesByDay(matches);

    return (
        <FlatList
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
            refreshControl={<RefreshControl {...refresh} />}
            renderItem={({ item, index }) => (
                <MenuSection key={index} title={item.title}>
                    {item.matches.map((match, idx) => (
                        <MatchesListItem
                            key={idx}
                            match={match}
                            onPress={() =>
                                nav.navigate('match', { id: match.id })
                            }
                        />
                    ))}
                </MenuSection>
            )}
            ListEmptyComponent={<NoMatchesPlayedYet />}
            {...rest}
        />
    );
}
