import React from 'react';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Avatar from '@/components/Avatar';
import { theme } from '@/theme';

import { Match } from './MatchesList';

const MAX_ITEMS = 4;

export interface MatchVsHeaderProps {
    match: Omit<Match, 'date'>;

    style?: any;

    hasScore?: boolean;
}
export default function MatchVsHeader({
    match,
    style,
    hasScore = true,
}: MatchVsHeaderProps) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,

                ...(style ?? {}),
            }}
        >
            <View style={{ flexDirection: 'row' }}>
                {Array(Math.max(MAX_ITEMS - match.blueTeam.length, 0))
                    .fill(null)
                    .map((_, index) => {
                        return <Avatar key={index} style={{ opacity: 0 }} />;
                    })}
                {match.blueTeam.slice(0, MAX_ITEMS).map((i, index) => (
                    <Avatar
                        key={index}
                        content={
                            index === MAX_ITEMS - 1 &&
                            match.blueTeam.length > MAX_ITEMS
                                ? '+' + (match.blueTeam.length - MAX_ITEMS + 1)
                                : undefined
                        }
                        name={i.name}
                        borderColor={theme.color.team.blue}
                        style={{ marginLeft: index === 0 ? 0 : -16 }}
                    />
                ))}
            </View>

            <View
                style={{
                    alignItems: 'center',

                    gap: 2,
                }}
            >
                <Icon
                    name="crown-outline"
                    size={24}
                    color={
                        Math.round(Math.random()) === 1
                            ? theme.color.team.red
                            : theme.color.team.blue
                    }
                />
                <Text
                    style={{
                        color: '#fff',
                        backgroundColor: '#000',
                        borderRadius: 2,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        fontSize: 16,

                        // backgroundColor:
                        //   Math.round(Math.random()) === 1
                        //     ? theme.color.team.red
                        //     : theme.color.team.blue,
                    }}
                >
                    {hasScore ? match.redCups + ':' + match.blueCups : 'vs'}
                </Text>
            </View>

            <View style={{ flexDirection: 'row' }}>
                {match.redTeam.slice(0, MAX_ITEMS).map((i, index) => (
                    <Avatar
                        key={index}
                        content={
                            index === MAX_ITEMS - 1 &&
                            match.redTeam.length > MAX_ITEMS
                                ? '+' + (match.redTeam.length - MAX_ITEMS + 1)
                                : undefined
                        }
                        name={i.name}
                        borderColor={theme.color.team.red}
                        style={{ marginLeft: index === 0 ? 0 : -16 }}
                    />
                ))}
                {Array(Math.max(MAX_ITEMS - match.redTeam.length, 0))
                    .fill(null)
                    .map((_, index) => {
                        return <Avatar key={index} style={{ opacity: 0 }} />;
                    })}
            </View>
        </View>
    );
}
