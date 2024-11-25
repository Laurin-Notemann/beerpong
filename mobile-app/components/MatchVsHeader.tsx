import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match, TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import { theme } from '@/theme';

import { TeamId } from './screens/NewMatchAssignTeams';

function ScoreChip({
    winnerTeamId,
    children,
}: {
    winnerTeamId: 'red' | 'blue' | null;
    children: React.ReactNode;
}) {
    return (
        <View
            style={{
                alignItems: 'center',

                gap: 2,
            }}
        >
            {winnerTeamId && (
                <Icon
                    name="crown-outline"
                    size={24}
                    color={theme.color.team[winnerTeamId]}
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
                {children}
            </Text>
        </View>
    );
}

export interface MatchVsHeaderProps extends ViewProps {
    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    hasScore?: boolean;

    maxItems?: number;

    highlightedId?: string;
}
export default function MatchVsHeader({
    match,
    hasScore = true,
    maxItems = 4,
    highlightedId,
    ...rest
}: MatchVsHeaderProps) {
    const redWon = match.redCups > match.blueCups;

    const winnerTeamId: TeamId =
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
            <View
                style={{
                    flexDirection: 'row',
                    position: 'relative',
                    height: 36,
                    width: 76,
                }}
            >
                <Team
                    color="blue"
                    players={match.blueTeam}
                    maxItems={maxItems}
                    highlightedId={highlightedId}
                />
                <Team
                    color="blue"
                    players={match.blueTeam}
                    maxItems={maxItems}
                    highlightedId={highlightedId}
                    isCopy
                />
            </View>

            <ScoreChip winnerTeamId={winnerTeamId}>
                {hasScore ? match.blueCups + ':' + match.redCups : 'vs'}
            </ScoreChip>

            <View
                style={{
                    flexDirection: 'row',
                    position: 'relative',
                    height: 36,
                    width: 76,
                }}
            >
                <Team
                    color="red"
                    players={match.redTeam}
                    maxItems={maxItems}
                    highlightedId={highlightedId}
                />
                <Team
                    color="red"
                    players={match.redTeam}
                    maxItems={maxItems}
                    highlightedId={highlightedId}
                    isCopy
                />
            </View>
        </View>
    );
}

function Team({
    highlightedId,
    players,
    maxItems,
    color,
    isCopy = false,
}: {
    highlightedId?: string | null;
    players: TeamMember[];
    maxItems: number;
    color: 'red' | 'blue';

    isCopy?: boolean;
}) {
    const emptyAvatarsUsedForSpacing = Array(
        Math.max(maxItems - players.length, 0)
    ).fill(null);

    const displayedPlayers = players.slice(0, maxItems);

    return (
        <View
            style={[
                isCopy
                    ? {
                          position: 'absolute',
                          left: color === 'red' ? 0 : undefined,
                          right: color === 'blue' ? 0 : undefined,
                          top: 0,
                      }
                    : {
                          opacity: highlightedId == null ? 1 : 0.5,
                      },
                { flexDirection: 'row' },
            ]}
        >
            {displayedPlayers.map((i, index) => (
                <Avatar
                    key={index}
                    url={i.avatarUrl}
                    content={
                        index === maxItems - 1 && players.length > maxItems
                            ? '+' + (players.length - maxItems + 1)
                            : undefined
                    }
                    name={i.name}
                    borderColor={theme.color.team[color]}
                    style={{
                        marginRight: color === 'red' ? -16 : 0,
                        marginLeft: color === 'blue' ? -16 : 0,

                        opacity: isCopy ? (i.id === highlightedId ? 1 : 0) : 1,
                        zIndex: i.id === highlightedId ? 1 : undefined,
                    }}
                />
            ))}
            {emptyAvatarsUsedForSpacing.map((_, index) => {
                return (
                    <Avatar
                        key={index}
                        style={{
                            opacity: 0,
                            marginRight: color === 'red' ? -16 : 0,
                            marginLeft: color === 'blue' ? -16 : 0,
                        }}
                    />
                );
            })}
        </View>
    );
}
