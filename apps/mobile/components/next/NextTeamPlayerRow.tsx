import React from 'react';
import { Pressable, Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useNextTokens } from '@/components/next/tokens';
import type { Player, TeamId } from '@/components/screens/NewMatchAssignTeams';
import { TutorialBubble } from '@/components/TutorialBubble';

function TeamPill({
    team,
    selected,
    onPress,
}: {
    team: 'blue' | 'red';
    selected: boolean;
    onPress: () => void;
}) {
    const t = useNextTokens();
    return (
        <Pressable
            onPress={onPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={team === 'blue' ? 'Blue team' : 'Red team'}
            style={{
                width: 58,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? t[team] : t[`${team}Tint`],
            }}
        >
            <Text
                style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selected ? '#fff' : t[team],
                }}
            >
                {team === 'blue' ? 'Blue' : 'Red'}
            </Text>
        </Pressable>
    );
}

/**
 * A player in New Match: the row tints in the team's color and two large pills pick the
 * team; tapping the row cycles none → blue → red. New Design only.
 */
export function NextTeamPlayerRow({
    player,
    randomTeamsMode,
    onSelectTeam,
    onCycle,
    onRandomTeamSelect,
    hasTutorial,
}: {
    player: Player;
    randomTeamsMode: { players: string[] } | null;
    onSelectTeam: (team: TeamId) => void;
    onCycle: () => void;
    onRandomTeamSelect: (playerId: string) => void;
    hasTutorial: boolean;
}) {
    const t = useNextTokens();
    const team = player.team;
    const inRandom = randomTeamsMode?.players.includes(player.id) ?? false;

    return (
        <Pressable
            onPress={
                randomTeamsMode ? () => onRandomTeamSelect(player.id) : onCycle
            }
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                height: 60,
                paddingLeft: 14,
                paddingRight: 10,
                backgroundColor: pressed
                    ? t.surfacePressed
                    : team && !randomTeamsMode
                      ? t[`${team}Tint`]
                      : 'transparent',
                borderLeftWidth: 4,
                borderLeftColor:
                    team && !randomTeamsMode ? t[team] : 'transparent',
            })}
        >
            <Avatar
                url={player.avatarUrl}
                size={38}
                name={player.name}
                borderColor={team && !randomTeamsMode ? t[team] : undefined}
            />
            <Text
                numberOfLines={1}
                style={{
                    flex: 1,
                    fontSize: 17,
                    fontWeight: '500',
                    color: t.text,
                }}
            >
                {player.name}
            </Text>
            {randomTeamsMode ? (
                <Icon
                    name={inRandom ? 'check-circle' : 'circle-outline'}
                    size={26}
                    color={inRandom ? t.text : t.textSecondary}
                />
            ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TeamPill
                        team="blue"
                        selected={team === 'blue'}
                        onPress={() =>
                            onSelectTeam(team === 'blue' ? null : 'blue')
                        }
                    />
                    <TeamPill
                        team="red"
                        selected={team === 'red'}
                        onPress={() =>
                            onSelectTeam(team === 'red' ? null : 'red')
                        }
                    />
                </View>
            )}
            {hasTutorial && (
                <TutorialBubble text="Tap a name to switch teams" left={64} />
            )}
        </Pressable>
    );
}
