import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    SafeAreaView,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import Avatar from '@/components/Avatar';
import { HeaderItem } from '@/components/HeaderItem';
import { BlurredBackdrop } from '@/components/LongPressModal';
import MatchesList from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { PlayerPageHeadSection } from '@/components/PlayerPageHeadSection';
import { RefreshControl } from '@/components/RefreshControl';
import { useTheme } from '@/theme';

const CLOSE_BUTTON = false;
const SHOW_PAST_SEASONS = false;

const { width: screenWidth } = Dimensions.get('window');

export interface PlayerScreenProps {
    minMatchesRequiredToBeRanked: number;
    isPending: boolean;
    id: string;
    placement: number;

    name: string;
    avatarUrl?: string | null;

    matches: Match[];
    matchesWon: number;
    points: number;
    cups: number;
    elo: number;
    hasPremium?: boolean;

    pastSeasons: number;

    onDelete?: () => void;
    onUploadAvatarPress: () => void;
    onDeleteAvatarPress: () => void;
    refresh: RefreshProps;
    rankingAlgorithm: 'AVERAGE' | 'ELO';
}
export default function PlayerScreen({
    minMatchesRequiredToBeRanked,
    isPending,
    id,
    placement,
    name,
    avatarUrl,
    matches,
    matchesWon,
    points,
    cups,
    elo,
    pastSeasons,
    hasPremium = false,

    onDelete,
    onUploadAvatarPress,
    onDeleteAvatarPress,
    refresh,
    rankingAlgorithm,
}: PlayerScreenProps) {
    const theme = useTheme();

    const nav = useNavigation();

    const [editable, setEditable] = useState(false);

    const insets = useInsets(true);

    // account for division by zero
    const averagePointsPerMatch =
        matches.length > 0 ? (points / matches.length).toFixed(1) : '--';

    const isUnranked = matches.length < minMatchesRequiredToBeRanked;

    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    const [inspectAvatar, setInspectAvatar] = useState(false);

    const [show, setShow] = useState(false);

    useEffect(() => {
        if (inspectAvatar) {
            setShow(true);
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    duration: 100,
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start(() => setShow(false));
        }
    }, [inspectAvatar, fade, scale]);

    return (
        <GestureHandlerRootView
            style={{ backgroundColor: theme.color.bg, flex: 1 }}
        >
            <Stack.Screen
                options={{
                    ...useNavStyles(),

                    headerBackTitleVisible: false,
                    title: '',
                    headerTitle: 'Player',
                    headerRight: () => (
                        <HeaderItem
                            isLoading={isPending}
                            onPress={() => setEditable((prev) => !prev)}
                        >
                            {editable ? 'Done' : 'Edit'}
                        </HeaderItem>
                    ),
                }}
            />
            {!editable && (
                <MatchesList
                    contentContainerStyle={{
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    }}
                    ListHeaderComponent={
                        <>
                            <TouchableHighlight
                                onPress={() => setInspectAvatar(true)}
                            >
                                <PlayerPageHeadSection
                                    avatarUrl={avatarUrl}
                                    placement={placement}
                                    name={name}
                                    elo={elo}
                                    matchesWon={matchesWon}
                                    points={points}
                                    cups={cups}
                                    isUnranked={isUnranked}
                                    editable={editable}
                                    averagePointsPerMatch={
                                        averagePointsPerMatch
                                    }
                                    onUploadAvatarPress={onUploadAvatarPress}
                                    matches={matches}
                                    rankingAlgorithm={rankingAlgorithm}
                                />
                            </TouchableHighlight>
                            <View
                                style={{
                                    width: '100%',
                                    alignItems: 'stretch',
                                }}
                            >
                                {SHOW_PAST_SEASONS && pastSeasons > 0 && (
                                    <MenuSection>
                                        <MenuItem
                                            title="Past Seasons"
                                            headIcon="pencil-outline"
                                            tailContent={pastSeasons}
                                            tailIconType="next"
                                            onPress={() =>
                                                nav.navigate('pastSeasons')
                                            }
                                        />
                                    </MenuSection>
                                )}
                            </View>
                        </>
                    }
                    matches={matches}
                    refresh={refresh}
                    forPlayer={{ id }}
                />
            )}
            {editable && (
                <ScrollView
                    style={{
                        flex: 1,

                        backgroundColor: theme.color.bg,
                    }}
                    contentContainerStyle={{
                        top: insets.top,
                        alignItems: 'center',

                        paddingBottom: 32,
                    }}
                    refreshControl={<RefreshControl {...refresh} />}
                >
                    <PlayerPageHeadSection
                        avatarUrl={avatarUrl}
                        placement={placement}
                        name={name}
                        elo={elo}
                        matchesWon={matchesWon}
                        points={points}
                        cups={cups}
                        isUnranked={isUnranked}
                        editable={editable}
                        averagePointsPerMatch={averagePointsPerMatch}
                        onUploadAvatarPress={onUploadAvatarPress}
                        matches={matches}
                        rankingAlgorithm={rankingAlgorithm}
                    />
                    <View
                        style={{
                            width: '100%',
                            alignItems: 'stretch',
                            paddingHorizontal: 16,
                        }}
                    >
                        <MenuSection>
                            <MenuItem
                                title={name}
                                headIcon="pencil-outline"
                                onPress={() =>
                                    nav.navigate('editPlayerName', { id })
                                }
                                tailIconType="next"
                            />
                            <MenuItem
                                title="Delete Player"
                                headIcon="delete-outline"
                                onPress={onDelete}
                                type="danger"
                                confirmationPrompt={{
                                    title: 'Delete Player',
                                    description:
                                        'Are you sure you want to delete this player?',
                                }}
                            />
                            <MenuItem
                                title="Remove Profile Picture"
                                headIcon="delete-outline"
                                onPress={onDeleteAvatarPress}
                                type="danger"
                                confirmationPrompt={{
                                    title: 'Remove Profile Picture',
                                    description:
                                        "Are you sure you want to remove this player's profile picture?",
                                }}
                            />
                        </MenuSection>
                    </View>
                </ScrollView>
            )}
            <Modal
                transparent
                visible={show}
                animationType="none"
                onRequestClose={() => setInspectAvatar(false)}
            >
                <BlurredBackdrop
                    opacity={fade}
                    onPress={() => setInspectAvatar(false)}
                />
                {CLOSE_BUTTON && (
                    <SafeAreaView>
                        <Animated.View
                            style={[{ transform: [{ scale }], opacity: scale }]}
                        >
                            <TouchableOpacity
                                onPress={() => setInspectAvatar(false)}
                            >
                                <Icon
                                    color={theme.color.text.primary}
                                    name="close"
                                    size={32}
                                />
                            </TouchableOpacity>
                        </Animated.View>
                    </SafeAreaView>
                )}
                <Animated.View
                    style={[
                        {
                            marginVertical: 'auto',
                            alignItems: 'center',
                        },
                        { transform: [{ scale }], opacity: scale },
                    ]}
                >
                    <Avatar
                        url={avatarUrl}
                        size={screenWidth - 64}
                        name={name}
                    />
                </Animated.View>
            </Modal>
        </GestureHandlerRootView>
    );
}
