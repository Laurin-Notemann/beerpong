import React from 'react';
import { Pressable, ScrollView, TouchableHighlight, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import Avatar from '@/components/Avatar';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection, { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { TutorialBubble } from '@/components/TutorialBubble';
import { triggerHapticBump } from '@/haptics';
import { theme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useTutorials } from '@/zustand/tutorialStore';

export type TeamId = 'red' | 'blue' | null;

function PlayerItem({
    player,
    onSelectTeam,

    hasTutorial = false,
}: {
    player: Player;
    isRedTeam?: boolean;
    isBlueTeam?: boolean;
    onSelectTeam: (team: TeamId) => void;

    hasTutorial?: boolean;
}) {
    const isRedTeam = player.team === 'red';
    const isBlueTeam = player.team === 'blue';

    const { setHasTappedToAssignPlayers } = useTutorials();

    return (
        <TouchableHighlight
            onPress={() => {
                if (player.team === null) onSelectTeam('blue');
                if (player.team === 'blue') onSelectTeam('red');
                if (player.team === 'red') onSelectTeam(null);

                setHasTappedToAssignPlayers();

                triggerHapticBump('selection');
            }}
            underlayColor={theme.panel.light.active}
            style={{
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',

                height: 50,
                paddingLeft: 16,
            }}
        >
            <>
                <Avatar url={player.avatarUrl} size={36} name={player.name} />
                <Text
                    color="primary"
                    numberOfLines={1}
                    style={{
                        fontSize: 17,

                        marginLeft: 12,
                        marginRight: 'auto',
                        flex: 1,
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
                {hasTutorial && (
                    <TutorialBubble
                        text="Try double-tapping a players name!"
                        left={-12}
                        top={-12}
                    />
                )}
            </>
        </TouchableHighlight>
    );
}

export type Player = Pick<TeamMember, 'id' | 'name' | 'team' | 'avatarUrl'>;

export interface NewMatchAssignTeamsProps {
    players: Player[];
    setTeam: (playerId: string, team: TeamId) => void;
}
export default function NewMatchAssignTeams({
    players,
    setTeam,
}: NewMatchAssignTeamsProps) {
    const insets = useInsets(true, true);

    const nav = useNavigation();

    const { hasTappedToAssignPlayers } = useTutorials();

    const experiments = useLocalSettings();

    return (
        <ScrollView
            style={{
                flex: 1,
            }}
            contentContainerStyle={{
                paddingTop: insets.top,
                paddingHorizontal: 16,

                paddingBottom: insets.bottom + 24,
            }}
        >
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
                {players.length === 0 && (
                    <View
                        style={{
                            height: 62,
                            width: '100%',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            color="secondary"
                            style={{
                                textAlign: 'center',
                            }}
                        >
                            Add players to create a match
                        </Text>
                    </View>
                )}
                {players.map((i, idx) => (
                    <PlayerItem
                        hasTutorial={
                            experiments.tutorials &&
                            !hasTappedToAssignPlayers &&
                            idx === 1
                        }
                        key={idx}
                        player={i}
                        onSelectTeam={(team) => setTeam(i.id, team)}
                    />
                ))}
            </MenuSection>
        </ScrollView>
    );
}
