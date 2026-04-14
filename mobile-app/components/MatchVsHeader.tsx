import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { MinimalMatch, TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { useTheme } from '@/theme';

export function ScoreChip({
    winnerTeamId,
    children = 'vs',
}: {
    winnerTeamId?: 'red' | 'blue' | null;
    children?: React.ReactNode;
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

export interface MatchVsHeaderProps extends ViewProps {
    match: Omit<MinimalMatch, 'id' | 'date'> | null | undefined;

    hasScore?: boolean;

    maxItems?: number;

    highlightedId?: string;

    variant?: 'default' | 'header';
}
function MatchVsHeader({
    match,
    hasScore = true,
    maxItems = 4,
    highlightedId,
    variant = 'default',
    ...rest
}: MatchVsHeaderProps) {
    if (!match) return null;

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

                    gap: variant === 'header' ? 2 : 16,
                    bottom: variant === 'header' ? 4 : undefined,
                },
                rest.style,
            ]}
        >
            <TeamMemo
                color="blue"
                players={match.blueTeam}
                maxItems={maxItems}
                highlightedId={highlightedId}
            />

            <ScoreChip winnerTeamId={winnerTeamId}>
                {hasScore ? match.blueCups + ':' + match.redCups : 'vs'}
            </ScoreChip>

            <TeamMemo
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
    maxItems = 4,
    color,
    centered = false,
    style,
    size = 36,
}: {
    highlightedId?: string | null;
    players: TeamMember[];
    maxItems?: number;
    color: 'red' | 'blue';
    centered?: boolean;
    style?: ViewProps['style'];
    size?: number;
}) {
    const theme = useTheme();

    const displayedPlayers = players.slice(0, maxItems);

    const avatarSize = size;

    const avatarGap = size / 2.25;

    const maxWidth = avatarSize * maxItems - avatarGap * (maxItems - 1);
    const actualWidth =
        avatarSize * players.length - avatarGap * (players.length - 1);

    const highlightedPlayer = players.find(
        (i) => i.profileId === highlightedId
    );

    const mod = color === 'red' ? 1 : -1;

    return (
        <View
            style={[
                {
                    flexDirection: 'row',
                    justifyContent: color === 'red' ? 'flex-start' : 'flex-end',

                    width: centered ? actualWidth : maxWidth,
                },
                style,
            ]}
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
                            size={avatarSize}
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
                            variant="list"
                            style={{
                                marginRight:
                                    color === 'red' ? -avatarGap : undefined,
                                marginLeft:
                                    color === 'blue' ? -avatarGap : undefined,
                            }}
                        />
                    ))}
            </View>
            {highlightedPlayer && (
                <Avatar
                    size={avatarSize}
                    url={highlightedPlayer.avatarUrl}
                    name={highlightedPlayer.name}
                    borderColor={theme.color.team[color]}
                    variant="list"
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

const TeamMemo = React.memo(Team, (prev, next) => {
    if (
        prev.highlightedId !== next.highlightedId ||
        prev.color !== next.color ||
        prev.size !== next.size ||
        prev.maxItems !== next.maxItems
    ) {
        return false;
    }
    if (prev.players.length !== next.players.length) {
        return false;
    }
    // Compare only properties used for rendering
    for (let idx = 0; idx < prev.players.length; idx++) {
        const p = prev.players[idx];
        const n = next.players[idx];
        if (
            p.profileId !== n.profileId ||
            p.avatarUrl !== n.avatarUrl ||
            p.name !== n.name
        ) {
            return false;
        }
    }
    return true;
});

const MemoMatchVsHeader = React.memo(MatchVsHeader, (prev, next) => {
    if (
        prev.highlightedId !== next.highlightedId ||
        prev.hasScore !== next.hasScore ||
        prev.maxItems !== next.maxItems
    ) {
        return false;
    }
    const a = prev.match;
    const b = next.match;

    if (!a || !b) return false;

    if (a.blueCups !== b.blueCups || a.redCups !== b.redCups) {
        return false;
    }
    // Teams shallow compare for items used in Team comparator
    if (
        a.blueTeam.length !== b.blueTeam.length ||
        a.redTeam.length !== b.redTeam.length
    ) {
        return false;
    }
    for (let idx = 0; idx < a.blueTeam.length; idx++) {
        const pa = a.blueTeam[idx];
        const pb = b.blueTeam[idx];
        if (
            pa.profileId !== pb.profileId ||
            pa.avatarUrl !== pb.avatarUrl ||
            pa.name !== pb.name
        ) {
            return false;
        }
    }
    for (let idx = 0; idx < a.redTeam.length; idx++) {
        const pa = a.redTeam[idx];
        const pb = b.redTeam[idx];
        if (
            pa.profileId !== pb.profileId ||
            pa.avatarUrl !== pb.avatarUrl ||
            pa.name !== pb.name
        ) {
            return false;
        }
    }
    return true;
});

export default MemoMatchVsHeader;
export { TeamMemo as Team };
