import { Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, TouchableHighlight } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection, { Heading } from '@/components/Menu/MenuSection';
import { triggerHapticBump } from '@/haptics';
import { theme } from '@/theme';

import Avatar from '../Avatar';
import MatchVsHeader from '../MatchVsHeader';

export type TeamId = 'red' | 'blue' | null;

function PlayerItem({
    player,
    onSelectTeam,
}: {
    player: Player;
    isRedTeam?: boolean;
    isBlueTeam?: boolean;
    onSelectTeam: (team: TeamId) => void;
}) {
    const isRedTeam = player.team === 'red';
    const isBlueTeam = player.team === 'blue';

    return (
        <TouchableHighlight
            onPress={() => {
                if (player.team === null) onSelectTeam('blue');
                if (player.team === 'blue') onSelectTeam('red');
                if (player.team === 'red') onSelectTeam(null);

                triggerHapticBump('selection');
            }}
            underlayColor={theme.panel.light.active}
            style={{
                flexDirection: 'row',
                alignItems: 'center',

                height: 50,
                paddingLeft: 16,
            }}
        >
            <>
                <Avatar url={player.avatarUrl} size={36} name={player.name} />
                <Text
                    style={{
                        fontSize: 17,
                        color: theme.color.text.primary,

                        marginLeft: 12,
                        marginRight: 'auto',
                    }}
                >
                    {player.name}
                </Text>

                <Pressable
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',

                        width: 50,
                        height: 50,
                    }}
                    onPress={() => {
                        onSelectTeam(isBlueTeam ? null : 'blue');
                        triggerHapticBump('selection');
                    }}
                >
                    <Icon
                        color={theme.color.team.blue}
                        size={24}
                        name={isBlueTeam ? 'check-circle' : 'circle-outline'}
                        style={{ opacity: isBlueTeam ? 1 : 0.7 }}
                    />
                </Pressable>

                <Pressable
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',

                        width: 50,
                        height: 50,
                    }}
                    onPress={() => {
                        onSelectTeam(isRedTeam ? null : 'red');
                        triggerHapticBump('selection');
                    }}
                >
                    <Icon
                        color={theme.color.team.red}
                        size={24}
                        name={isRedTeam ? 'check-circle' : 'circle-outline'}
                        style={{ opacity: isRedTeam ? 1 : 0.7 }}
                    />
                </Pressable>
            </>
        </TouchableHighlight>
    );
}

export type Player = Pick<TeamMember, 'id' | 'name' | 'team' | 'avatarUrl'>;

export interface NewMatchAssignTeamsProps {
    players: Player[];
    setTeam: (playerId: string, team: TeamId) => void;
    onSubmit: () => void;
}
export default function NewMatchAssignTeams({
    players,
    setTeam,
    onSubmit,
}: NewMatchAssignTeamsProps) {
    const nav = useNavigation();

    const blueTeam = players.filter((i) => i.team === 'blue');
    const redTeam = players.filter((i) => i.team === 'red');

    const canCreateMatch = blueTeam.length > 0 && redTeam.length > 0;

    return (
        <ScrollView
            style={{
                flex: 1,

                backgroundColor: theme.color.bg,
            }}
            contentContainerStyle={{
                paddingHorizontal: 16,

                paddingBottom: 24,
            }}
        >
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerRight: () => (
                        <HeaderItem
                            disabled={!canCreateMatch}
                            onPress={() => onSubmit()}
                        >
                            Next
                        </HeaderItem>
                    ),

                    headerTitle:
                        blueTeam.length > 0 || redTeam.length > 0
                            ? () => (
                                  <MatchVsHeader
                                      match={{
                                          id: '#',
                                          // @ts-expect-error TODO: fix typing to only require the fields we actually need
                                          blueTeam,
                                          // @ts-expect-error TODO: fix typing to only require the fields we actually need
                                          redTeam,
                                          blueCups: 0,
                                          redCups: 0,
                                      }}
                                      hasScore={false}
                                      style={{
                                          bottom: 4,
                                      }}
                                  />
                              )
                            : 'Assign Teams',
                }}
            />
            <Heading />
            <MenuSection style={{ marginBottom: 20 }}>
                <MenuItem
                    headIcon="account-plus-outline"
                    title="Create new Player"
                    tailIconType="next"
                    onPress={() => nav.navigate('createNewPlayer')}
                />
            </MenuSection>
            <MenuSection>
                {players.map((i, idx) => (
                    <PlayerItem
                        key={idx}
                        player={i}
                        onSelectTeam={(team) => setTeam(i.id, team)}
                    />
                ))}
            </MenuSection>
        </ScrollView>
    );
}
