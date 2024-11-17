import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, TouchableHighlight } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HeaderItem } from '@/app/(tabs)/_layout';
import { useNavigation } from '@/app/navigation/useNavigation';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import Avatar from '../Avatar';
import MatchVsHeader from '../MatchVsHeader';

export type TeamId = 'red' | 'blue' | null;

function PlayerItem({
    player,
    team,
    onSelectTeam,
}: {
    player: { name: string };
    team?: TeamId;
    isRedTeam?: boolean;
    isBlueTeam?: boolean;
    onSelectTeam: (team: 'blue' | 'red' | null) => void;
}) {
    const isRedTeam = team === 'red';
    const isBlueTeam = team === 'blue';

    return (
        <TouchableHighlight
            onPress={() => {
                if (team === null) onSelectTeam('blue');
                if (team === 'blue') onSelectTeam('red');
                if (team === 'red') onSelectTeam(null);
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
                <Avatar size={36} name={player.name} />
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
                    onPress={() => onSelectTeam(isBlueTeam ? null : 'blue')}
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
                    onPress={() => onSelectTeam(isRedTeam ? null : 'red')}
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

interface Player {
    id: string;
    name: string;
    team: TeamId;
}

export interface NewMatchAssignTeamsProps {
    players: Player[];
    setTeam: (playerId: string, team: TeamId) => void;
}
export default function NewMatchAssignTeams({
    players,
    setTeam,
}: NewMatchAssignTeamsProps) {
    const nav = useNavigation();

    useEffect(() => {
        function updateHeader() {
            const blueTeam = players.filter((i) => i.team === 'blue');
            const redTeam = players.filter((i) => i.team === 'red');

            const canCreateMatch = blueTeam.length > 0 && redTeam.length > 0;

            nav.setOptions({
                headerRight: () => (
                    <HeaderItem
                        disabled={!canCreateMatch}
                        onPress={() => nav.navigate('newMatchPoints')}
                    >
                        Next
                    </HeaderItem>
                ),

                headerTitle:
                    blueTeam.length > 0 || redTeam.length > 0
                        ? () => (
                              <MatchVsHeader
                                  match={{
                                      blueTeam,
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
                        : 'New Match',
            });
        }
        updateHeader();
    }, [players]);

    return (
        <ScrollView
            style={{
                backgroundColor: theme.color.bg,
            }}
            contentContainerStyle={{
                flex: 1,
                paddingHorizontal: 16,
            }}
        >
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
                        team={i.team}
                        onSelectTeam={(team) => setTeam(i.id, team)}
                    />
                ))}
            </MenuSection>
        </ScrollView>
    );
}
