import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import { theme } from '@/theme';

import { TeamId } from './screens/NewMatchAssignTeams';

const MAX_ITEMS = 4;

export interface MatchVsHeaderProps extends ViewProps {
    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    hasScore?: boolean;
}
export default function MatchVsHeader({
    match,
    hasScore = true,
    ...rest
}: MatchVsHeaderProps) {
    const redWon = match.redCups > match.blueCups;

    const winner: TeamId =
        match.redCups > match.blueCups
            ? 'red'
            : match.redCups < match.blueCups
              ? 'blue'
              : null;

    return (
        <View
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                },
                rest.style,
            ]}
        >
            <View style={{ flexDirection: 'row' }}>
                {Array(Math.max(MAX_ITEMS - match.blueTeam.length, 0))
                    .fill(null)
                    .map((_, index) => {
                        return (
                            <Avatar
                                key={index}
                                style={{ opacity: 0, marginLeft: -16 }}
                            />
                        );
                    })}
                {match.blueTeam.slice(0, MAX_ITEMS).map((i, index) => (
                    <Avatar
                        key={index}
                        url={i.avatarUrl}
                        content={
                            index === MAX_ITEMS - 1 &&
                            match.blueTeam.length > MAX_ITEMS
                                ? '+' + (match.blueTeam.length - MAX_ITEMS + 1)
                                : undefined
                        }
                        name={i.name}
                        borderColor={theme.color.team.blue}
                        style={{ marginLeft: -16 }}
                    />
                ))}
            </View>

            <View
                style={{
                    alignItems: 'center',

                    gap: 2,
                }}
            >
                {winner && (
                    <Icon
                        name="crown-outline"
                        size={24}
                        color={theme.color.team[winner]}
                    />
                )}
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
                    {hasScore ? match.blueCups + ':' + match.redCups : 'vs'}
                </Text>
            </View>

            <View style={{ flexDirection: 'row' }}>
                {match.redTeam.slice(0, MAX_ITEMS).map((i, index) => (
                    <Avatar
                        key={index}
                        url={i.avatarUrl}
                        content={
                            index === MAX_ITEMS - 1 &&
                            match.redTeam.length > MAX_ITEMS
                                ? '+' + (match.redTeam.length - MAX_ITEMS + 1)
                                : undefined
                        }
                        name={i.name}
                        borderColor={theme.color.team.red}
                        style={{ marginRight: -16 }}
                    />
                ))}
                {Array(Math.max(MAX_ITEMS - match.redTeam.length, 0))
                    .fill(null)
                    .map((_, index) => {
                        return (
                            <Avatar
                                key={index}
                                style={{ opacity: 0, marginRight: -16 }}
                            />
                        );
                    })}
            </View>
        </View>
    );
}
