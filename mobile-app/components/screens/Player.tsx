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

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { AppBackground } from '@/app/Background';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import Avatar from '@/components/Avatar';
import { HeaderItem } from '@/components/HeaderItem';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { BlurredBackdrop } from '@/components/LongPressModal';
import MatchesList from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { PlayerAndMatchBottomNav } from '@/components/PlayerAndMatchBottomNav';
import { PlayerPageHeadSection } from '@/components/PlayerPageHeadSection';
import { RefreshControl } from '@/components/RefreshControl';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { PastSeasonsEmptyScreen } from '@/screens/PastSeasonsEmptyScreen';
import { useTheme } from '@/theme';
import { useScopePicker } from '@/zustand/useScopePicker';

import { OverlayIconButton } from '../overlay/OverlayIconButton';

const swiperAtTop = false;

const { width: screenWidth } = Dimensions.get('window');

export interface ScopeInfo {
    minMatchesRequiredToBeRanked: number;
    placement: number;
    matches: Match[];
    matchesWon: number;
    points: number;
    cups: number;
    elo: number;
    rankingAlgorithm: 'AVERAGE' | 'ELO';
    isUnranked: boolean;
    name: string;
}

export interface PlayerScreenProps {
    isPending: boolean;
    id: string;
    profileId: string;

    name: string;
    avatarUrl?: string | null;

    hasPremium?: boolean;

    pastSeasons: number;

    onDelete?: () => void;
    onUploadAvatarPress: () => void;
    onDeleteAvatarPress: () => void;
    refresh: RefreshProps;

    scopes: Map<string, ScopeInfo>;

    prevPlayerId?: string;
    nextPlayerId?: string;
}
export default function PlayerScreen({
    isPending,
    id,
    profileId,
    name,
    avatarUrl,
    hasPremium = false,
    pastSeasons,
    onDelete,
    onUploadAvatarPress,
    onDeleteAvatarPress,
    refresh,

    prevPlayerId,
    nextPlayerId,

    scopes,
}: PlayerScreenProps) {
    const scopePicker = useScopePicker();

    const rankingAlgorithm = scopePicker.rankingAlgorithm;

    const theme = useTheme();

    const nav = useNavigation();

    const [editable, setEditable] = useState(false);

    const insets = useInsets(true);

    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    const [inspectAvatar, setInspectAvatar] = useState(false);

    const [show, setShow] = useState(false);

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasonss =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const leaderboardSwiper = useControlledSwiper(
        scopePicker.leaderboardSwiperProgress,
        'player'
    );
    const pastSeasonsSwiper = useControlledSwiper(
        scopePicker.pastSeasonsSwiperProgress,
        'pastPlayer'
    );

    const groupHasPastSeasons = pastSeasons > 0;

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
                    title: '',
                    headerTitle: 'Player',
                    headerLeft: undefined,
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
            <AppBackground />
            {!editable &&
                (scopePicker.isPastSeasonsMode ? (
                    groupHasPastSeasons ? (
                        <Swiper key={`past-${groupId}`} {...pastSeasonsSwiper}>
                            {pastSeasonss.map((obj) => (
                                <MatchesList
                                    key={obj.id}
                                    onMatchPress={(match) =>
                                        nav.navigate('match', {
                                            id: match.id,
                                            seasonId: match.seasonId,
                                        })
                                    }
                                    style={{ paddingHorizontal: 0 }}
                                    contentContainerStyle={{
                                        paddingTop:
                                            insets.top + (swiperAtTop ? 48 : 0),
                                        paddingBottom:
                                            insets.bottom +
                                            (swiperAtTop ? 0 : 48),
                                    }}
                                    ListHeaderComponent={
                                        <>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    setInspectAvatar(true)
                                                }
                                            >
                                                <PlayerPageHeadSection
                                                    {...scopes.get(obj.id!)!}
                                                    avatarUrl={avatarUrl}
                                                    name={name}
                                                    editable={editable}
                                                    onUploadAvatarPress={
                                                        onUploadAvatarPress
                                                    }
                                                    rankingAlgorithm={
                                                        rankingAlgorithm ??
                                                        scopes.get(obj.id!)!
                                                            .rankingAlgorithm
                                                    }
                                                />
                                            </TouchableOpacity>
                                        </>
                                    }
                                    matches={scopes.get(obj.id!)!.matches}
                                    refresh={refresh}
                                    forPlayer={{ profileId }}
                                />
                            ))}
                        </Swiper>
                    ) : (
                        <PastSeasonsEmptyScreen />
                    )
                ) : (
                    <Swiper
                        key={`leaderboard-${groupId}`}
                        {...leaderboardSwiper}
                    >
                        <MatchesList
                            onMatchPress={(match) =>
                                nav.navigate('match', {
                                    id: match.id,
                                    seasonId: match.seasonId,
                                })
                            }
                            style={{ paddingHorizontal: 0 }}
                            contentContainerStyle={{
                                paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                                paddingBottom:
                                    insets.bottom + (swiperAtTop ? 0 : 48),
                            }}
                            ListHeaderComponent={
                                <>
                                    <TouchableOpacity
                                        onPress={() => setInspectAvatar(true)}
                                    >
                                        <PlayerPageHeadSection
                                            {...scopes.get('today')!}
                                            avatarUrl={avatarUrl}
                                            name={name}
                                            editable={editable}
                                            onUploadAvatarPress={
                                                onUploadAvatarPress
                                            }
                                            rankingAlgorithm={
                                                rankingAlgorithm ??
                                                scopes.get('today')!
                                                    .rankingAlgorithm
                                            }
                                        />
                                    </TouchableOpacity>
                                </>
                            }
                            matches={scopes.get('today')!.matches}
                            refresh={refresh}
                            forPlayer={{ profileId }}
                        />
                        <MatchesList
                            onMatchPress={(match) =>
                                nav.navigate('match', {
                                    id: match.id,
                                    seasonId: match.seasonId,
                                })
                            }
                            style={{ paddingHorizontal: 0 }}
                            contentContainerStyle={{
                                paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                                paddingBottom:
                                    insets.bottom + (swiperAtTop ? 0 : 48),
                            }}
                            ListHeaderComponent={
                                <>
                                    <TouchableOpacity
                                        onPress={() => setInspectAvatar(true)}
                                    >
                                        <PlayerPageHeadSection
                                            // TODO: scopes.get('season') is actually null on first render sometimes
                                            {...(scopes.get('season') ?? {})}
                                            avatarUrl={avatarUrl}
                                            name={name}
                                            editable={editable}
                                            onUploadAvatarPress={
                                                onUploadAvatarPress
                                            }
                                            rankingAlgorithm={
                                                rankingAlgorithm ??
                                                scopes.get('season')
                                                    ?.rankingAlgorithm ??
                                                'ELO'
                                            }
                                        />
                                    </TouchableOpacity>
                                </>
                            }
                            matches={scopes.get('season')?.matches ?? []}
                            refresh={refresh}
                            forPlayer={{ profileId }}
                        />
                        {groupHasPastSeasons && (
                            <MatchesList
                                onMatchPress={(match) =>
                                    nav.navigate('match', {
                                        id: match.id,
                                        seasonId: match.seasonId,
                                    })
                                }
                                style={{ paddingHorizontal: 0 }}
                                contentContainerStyle={{
                                    paddingTop:
                                        insets.top + (swiperAtTop ? 48 : 0),
                                    paddingBottom:
                                        insets.bottom + (swiperAtTop ? 0 : 48),
                                }}
                                ListHeaderComponent={
                                    <>
                                        <TouchableOpacity
                                            onPress={() =>
                                                setInspectAvatar(true)
                                            }
                                        >
                                            <PlayerPageHeadSection
                                                {...scopes.get('all-time')!}
                                                avatarUrl={avatarUrl}
                                                name={name}
                                                editable={editable}
                                                onUploadAvatarPress={
                                                    onUploadAvatarPress
                                                }
                                                rankingAlgorithm={
                                                    rankingAlgorithm ??
                                                    scopes.get('all-time')!
                                                        .rankingAlgorithm
                                                }
                                            />
                                        </TouchableOpacity>
                                    </>
                                }
                                matches={scopes.get('all-time')!.matches}
                                refresh={refresh}
                                forPlayer={{ profileId }}
                            />
                        )}
                    </Swiper>
                ))}
            {editable && (
                <ScrollView
                    style={{
                        flex: 1,
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
                        placement={0} // doesn't get shown because this is only ever editable
                        name={name}
                        elo={0} // doesn't get shown because this is only ever editable
                        matchesWon={0} // doesn't get shown because this is only ever editable
                        points={0} // doesn't get shown because this is only ever editable
                        cups={0} // doesn't get shown because this is only ever editable
                        isUnranked={false} // doesn't get shown because this is only ever editable
                        editable
                        onUploadAvatarPress={onUploadAvatarPress}
                        matches={[]} // doesn't get shown because this is only ever editable
                        rankingAlgorithm={rankingAlgorithm!}
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
                                border={false}
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
                {/* <SafeAreaView
                    style={{
                        paddingHorizontal: 4,
                    }}
                >
                    <OverlayIconButton
                        iconName="close"
                        onPress={() => setInspectAvatar(false)}
                    />
                </SafeAreaView> */}

                <Animated.View
                    style={[
                        {
                            marginVertical: 'auto',
                            alignItems: 'center',

                            justifyContent: 'center',
                        },
                        { transform: [{ scale }], opacity: scale },
                    ]}
                >
                    <Avatar
                        url={avatarUrl}
                        // Avatar's size prop is a union type; pass via style for custom size
                        size={screenWidth - 64}
                        name={name}
                    />
                </Animated.View>
            </Modal>
            {!editable && (
                // <SafeAreaView
                //     style={{
                //         position: 'absolute',

                //         top: swiperAtTop ? insets.top + 4 : undefined,
                //         bottom: swiperAtTop ? undefined : insets.bottom + 4,

                //         width: '100%',
                //     }}
                // >
                //     <LeaderboardScopePicker />

                // </SafeAreaView>
                <View
                    style={{
                        position: 'absolute',

                        left: 0,
                        right: 0,
                        bottom: 0,
                    }}
                >
                    <LeaderboardScopePicker />

                    <PlayerAndMatchBottomNav
                        hasNextAndPrevButtons={false}
                        onPrevPress={
                            !prevPlayerId
                                ? undefined
                                : () => {
                                      if (prevPlayerId) {
                                          nav.navigate('player', {
                                              id: prevPlayerId,
                                          });
                                      }
                                  }
                        }
                        onNextPress={
                            !nextPlayerId
                                ? undefined
                                : () => {
                                      if (nextPlayerId) {
                                          nav.navigate('player', {
                                              id: nextPlayerId,
                                          });
                                      }
                                  }
                        }
                    />
                </View>
            )}
        </GestureHandlerRootView>
    );
}
