import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match, TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { useTheme } from '@/theme';

function ScoreChip({
    winnerTeamId,
    children,
}: {
    winnerTeamId: 'red' | 'blue' | null;
    children: React.ReactNode;
}) {
    const theme = useTheme();
    return (
        <View
            style={{
                alignItems: 'center',
                justifyContent: 'center',

                gap: 2,

                bottom: 2,

                // calibrated to the height of the text + the height of the crown icon so we don't get layout shift
                height: 49,

                // calibrated to be the width of the crown icon so we don't get layout shift
                minWidth: 34,
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
                    color: theme.color.text.primary,
                    backgroundColor: theme.color.bg,
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

const hasFinishMove = (team?: TeamMember[]): boolean => {
    return (
        team?.some((player) =>
            player.moves?.some((move) => move.isFinish && move.count > 0)
        ) ?? false
    );
};

type InputTeamMember = Pick<
    TeamMember,
    'name' | 'avatarUrl' | 'profileId' | 'moves'
>;

type InputMatch = Pick<Match, 'blueCups' | 'redCups'> & {
    blueTeam: InputTeamMember[];
    redTeam: InputTeamMember[];
};

export interface MatchVsHeaderProps extends ViewProps {
    match: InputMatch;

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
    const winnerTeamId: TeamId = hasFinishMove(match.redTeam)
        ? 'red'
        : hasFinishMove(match.blueTeam)
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
            <Team
                color="blue"
                players={match.blueTeam}
                maxItems={maxItems}
                highlightedId={highlightedId}
            />

            <ScoreChip winnerTeamId={winnerTeamId}>
                {hasScore ? match.blueCups + ':' + match.redCups : 'vs'}
            </ScoreChip>

            <Team
                color="red"
                players={match.redTeam}
                maxItems={maxItems}
                highlightedId={highlightedId}
            />
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
    const theme = useTheme();

    const displayedPlayers = players.slice(0, maxItems);

    const avatarSize = 36;

    const avatarGap = 16;

    const teamWidth = avatarSize * maxItems - avatarGap * (maxItems - 1);

    const highlightedPlayer = players.find(
        (i) => i.profileId === highlightedId
    );

    const mod = color === 'red' ? 1 : -1;

    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: color === 'red' ? 'flex-start' : 'flex-end',

                width: teamWidth,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    opacity: highlightedId ? 0.3 : 1,
                }}
            >
                {displayedPlayers
                    .sort((a, b) =>
                        a.profileId === highlightedId
                            ? -mod
                            : b.profileId === highlightedId
                              ? mod
                              : 0
                    )
                    .map((i, index) => (
                        <Avatar
                            key={index}
                            url={i.avatarUrl}
                            content={
                                index === maxItems - 1 &&
                                players.length > maxItems
                                    ? '+' + (players.length - maxItems + 1)
                                    : undefined
                            }
                            name={i.name}
                            borderColor={theme.color.team[color]}
                            style={{
                                marginRight: color === 'red' ? -16 : undefined,
                                marginLeft: color === 'blue' ? -16 : undefined,
                            }}
                        />
                    ))}
            </View>
            {highlightedPlayer && (
                <Avatar
                    url={highlightedPlayer.avatarUrl}
                    name={highlightedPlayer.name}
                    borderColor={theme.color.team[color]}
                    style={{
                        position: 'absolute',
                        left: color === 'red' ? 0 : undefined,
                        right: color === 'blue' ? 0 : undefined,

                        zIndex: 9,
                    }}
                />
            )}
        </View>
    );
}
