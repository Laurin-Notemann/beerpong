import dayjs from 'dayjs';
import React from 'react';
import { FlatList, Text, TouchableHighlight, View } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { groupMatchesByDay } from '@/api/utils/groupMatchesByDay';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { useNavigation } from '@/app/navigation/useNavigation';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import Button from './Button';
import IconHead from './IconHead';
import { MatchesListItem } from './MatchesListItem';
import MatchVsHeader from './MatchVsHeader';

export interface MatchesListProps {
    refresh: RefreshProps;
    matches: Match[];
}
export default function MatchesList({ matches, refresh }: MatchesListProps) {
    const nav = useNavigation();

    const days = groupMatchesByDay(matches);

    return (
        <FlatList
            contentContainerStyle={{
                paddingBottom: 32,
            }}
            style={{
                alignSelf: 'stretch',
                backgroundColor: theme.color.bg,

                paddingHorizontal: 16,
            }}
            data={days}
            refreshControl={<RefreshControl {...refresh} />}
            renderItem={({ item: day, index: listIndex }) => (
                <MenuSection key={listIndex} title={day.title}>
                    {day.matches.map((match, idx) => (
                        <MatchesListItem
                            key={idx}
                            match={match}
                            onPress={() => nav.navigate('match', match)}
                        />
                    ))}
                </MenuSection>
            )}
            ListEmptyComponent={
                <View style={{ paddingTop: 64 }}>
                    <IconHead
                        onTouchStart={() => nav.navigate('newMatch')}
                        iconName="format-list-bulleted"
                        title="No Matches Played"
                        description={
                            <Button
                                style={{
                                    marginTop: 24,
                                }}
                                onPress={() => {}}
                                title="Create match"
                                variant="primary"
                            />
                            // <Link
                            //     to="/joinGroup"
                            //     style={{
                            //         color: theme.color.text.primary,
                            //         fontWeight: 500,
                            //     }}
                            // >
                            //     foo
                            // </Link>
                        }
                    />
                </View>
            }
            // StickyHeaderComponent={}
        />
    );
}
