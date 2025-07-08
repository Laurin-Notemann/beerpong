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
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useTutorials } from '@/zustand/tutorialStore';

export type TeamId = 'red' | 'blue' | null;

function PlayerItem({
    randomTeamsMode,
    player,
    onSelectTeam,

    hasTutorial = false,

    onRandomTeamSelect,
}: {
    randomTeamsMode: { players: string[] } | null;
    player: Player;
    isRedTeam?: boolean;
    isBlueTeam?: boolean;
    onSelectTeam: (team: TeamId) => void;

    onRandomTeamSelect: (playerId: string) => void;

    hasTutorial?: boolean;
}) {
    const isRedTeam = player.team === 'red';
    const isBlueTeam = player.team === 'blue';

    const { setHasTappedToAssignPlayers } = useTutorials();

    const theme = useTheme();

    return (
        <TouchableHighlight
            onPress={() => {
                if (randomTeamsMode != null) {
                    onRandomTeamSelect(player.id);
                    triggerHapticBump('selection');
                    return;
                }
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

                {randomTeamsMode == null ? (
                    <>
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
                                name={
                                    isBlueTeam
                                        ? 'check-circle'
                                        : 'circle-outline'
                                }
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
                                name={
                                    isRedTeam
                                        ? 'check-circle'
                                        : 'circle-outline'
                                }
                                style={{ opacity: isRedTeam ? 1 : 0.7 }}
                            />
                        </Pressable>
                    </>
                ) : (
                    <View
                        style={{
                            alignItems: 'center',
                            justifyContent: 'center',

                            width: 50,
                            height: 50,
                        }}
                    >
                        <Icon
                            color={theme.color.text.secondary}
                            size={24}
                            name={
                                randomTeamsMode.players.includes(player.id)
                                    ? 'check-circle'
                                    : 'circle-outline'
                            }
                            style={{ opacity: isRedTeam ? 1 : 0.7 }}
                        />
                    </View>
                )}
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
    randomTeamsMode: { players: string[] } | null;
    onRandomTeamSelect: (playerId: string) => void;
    onRandomTeamsPress: () => void;
    minTeamSize: number;
    maxTeamSize: number;
    players: Player[];
    setTeam: (playerId: string, team: TeamId) => void;
}
export default function NewMatchAssignTeams({
    randomTeamsMode,
    onRandomTeamSelect,
    onRandomTeamsPress,
    minTeamSize,
    maxTeamSize,
    players,
    setTeam,
}: NewMatchAssignTeamsProps) {
    const insets = useInsets(true, true);

    const nav = useNavigation();

    const { hasTappedToAssignPlayers } = useTutorials();

    const experiments = useLocalSettings();

    const blueTeamSize = players.filter((i) => i.team === 'blue').length;
    const redTeamSize = players.filter((i) => i.team === 'red').length;

    const errorMessage = (() => {
        if (blueTeamSize < minTeamSize && minTeamSize > 1) {
            const needed = minTeamSize - blueTeamSize;
            return `Blue team needs ${needed} more ${needed === 1 ? 'player' : 'players'}`;
        }
        if (redTeamSize < minTeamSize && minTeamSize > 1) {
            const needed = minTeamSize - redTeamSize;
            return `Red team needs ${needed} more ${needed === 1 ? 'player' : 'players'}`;
        }
        if (blueTeamSize > maxTeamSize) {
            const extra = blueTeamSize - maxTeamSize;
            return `Blue team has ${extra} ${extra === 1 ? 'player' : 'players'} too many`;
        }
        if (redTeamSize > maxTeamSize) {
            const extra = redTeamSize - maxTeamSize;
            return `Red team has ${extra} ${extra === 1 ? 'player' : 'players'} too many`;
        }
    })();

    const isRandomTeamsMode = randomTeamsMode !== null;

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
            <Heading
                title={
                    errorMessage ? (
                        <Text
                            color="negative"
                            style={{
                                fontSize: 16,
                                fontWeight: 500,

                                marginBottom: 32,
                            }}
                        >
                            {errorMessage}
                        </Text>
                    ) : undefined
                }
            />
            {!isRandomTeamsMode && (
                <>
                    <MenuSection style={{ marginBottom: 20 }}>
                        <MenuItem
                            headIcon="dice-multiple-outline"
                            title="Random Teams"
                            tailIconType="next"
                            onPress={onRandomTeamsPress}
                        />
                    </MenuSection>
                    <MenuSection style={{ marginBottom: 20 }}>
                        <MenuItem
                            headIcon="account-plus-outline"
                            title="Create new Player"
                            tailIconType="next"
                            onPress={() => nav.navigate('createNewPlayer')}
                        />
                    </MenuSection>
                </>
            )}
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
                        randomTeamsMode={randomTeamsMode}
                        onRandomTeamSelect={onRandomTeamSelect}
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
