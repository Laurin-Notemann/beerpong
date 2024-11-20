import dayjs from 'dayjs';
import React from 'react';
import { FlatList, Text, TouchableHighlight, View } from 'react-native';

import { env } from '@/api/env';
import { useNavigation } from '@/app/navigation/useNavigation';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import Button from './Button';
import IconHead from './IconHead';
import { TeamMember } from './MatchPlayers';
import MatchVsHeader from './MatchVsHeader';

export type Match = {
    id: string;
    date: Date;
    redCups: number;
    blueCups: number;
    redTeam: TeamMember[];
    blueTeam: TeamMember[];
};

const groupIntoDays = (matches: Match[]) => {
    const dayjsMap = matches.reduce(
        (
            acc: Record<string, { matches: Match[]; title: string }>,
            obj: Match
        ) => {
            const dayKey = dayjs(obj.date).format('YYYY-MM-DD');

            if (!acc[dayKey]) {
                acc[dayKey] = {
                    matches: [],
                    title: env.format.date.matchesSeperatorDay(dayjs(obj.date)),
                };
            }
            acc[dayKey].matches.push(obj);

            return acc;
        },
        {}
    );
    return Object.values(dayjsMap);
};

export interface MatchesListProps {
    matches: Match[];
}
export default function MatchesList({ matches }: MatchesListProps) {
    const nav = useNavigation();

    const days = groupIntoDays(matches);

    return (
        <FlatList
            style={{
                alignSelf: 'stretch',
                backgroundColor: theme.color.bg,
            }}
            data={days}
            renderItem={({ item: day, index: listIndex }) => (
                <MenuSection key={listIndex} title={day.title}>
                    {day.matches.map((item, index) => (
                        <TouchableHighlight
                            underlayColor={theme.panel.light.active}
                            key={index}
                            style={{
                                backgroundColor: theme.panel.light.bg,
                                gap: 4,
                                paddingHorizontal: 16,
                                paddingVertical: 7,

                                borderTopColor: theme.panel.light.active,
                                borderTopWidth: 0.5,
                            }}
                            onPress={() =>
                                nav.navigate('match', { id: item.id })
                            }
                        >
                            <>
                                <MatchVsHeader match={item} />
                                <View style={{ flexDirection: 'row', gap: 16 }}>
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            color: theme.color.text.tertiary,
                                        }}
                                    >
                                        {env.format.date.matchHour(
                                            dayjs(item.date)
                                        )}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            color: theme.color.text.tertiary,
                                        }}
                                    >
                                        {item.blueTeam
                                            .map((i) => i.name)
                                            .join(', ') +
                                            ' - ' +
                                            item.redTeam
                                                .map((i) => i.name)
                                                .join(', ')}
                                    </Text>
                                </View>
                            </>
                        </TouchableHighlight>
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
