import dayjs, { Dayjs } from 'dayjs';
import React from 'react';
import { FlatList, Text, TouchableHighlight, View } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import Button from './Button';
import IconHead from './IconHead';
import MatchVsHeader from './MatchVsHeader';

const getDayName = (date: Dayjs) => {
    const today = dayjs();

    const diffDays = today.diff(date, 'day');

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.format('dddd'); // Day of the week, e.g., "Wednesday"
    } else {
        return date.format('DD.MM.YYYY'); // Full date format, e.g., "10.10.2024"
    }
};

type Match = {
    date: Date;
    redTeam: { name: string }[];
    blueTeam: { name: string }[];
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
                    title: getDayName(dayjs(obj.date)),
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
                            onPress={() => nav.navigate('match')}
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
                                        {dayjs().format('HH:mm')}
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
                        iconName="format-list-bulleted"
                        title="No Matches Played"
                        description={
                            <Button
                                onPress={() => {}}
                                title="Create match"
                                variant="secondary"
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
