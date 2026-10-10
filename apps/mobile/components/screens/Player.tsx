import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import Avatar from '@/components/Avatar';
import { BlurredBackdrop } from '@/components/BlurredBackdrop';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import MatchesList from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { PlayerPageHeadSection } from '@/components/PlayerPageHeadSection';
import { RefreshControl } from '@/components/RefreshControl';
import { ScoreClipTiles } from '@/components/ScoreClipTiles';
import { PastSeasonsEmptyScreen } from '@/components/screens/PastSeasonsEmptyScreen';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import type { Placement } from '@/constants/rankingAlgorithms';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';
import { useNewDesign } from '@/zustand/localSettingsStore';
import { useScopePicker } from '@/zustand/useScopePicker';

const { width: screenWidth } = Dimensions.get('window');

/** how many score clips a player can have (the API's maxScoreClips) */
const MAX_SCORE_CLIPS = 10;

export interface ScopeInfo {
    minMatchesRequiredToBeRanked: number;
    placement: Placement;
    matches: Match[];
    matchesWon: number;
    points: number;
    cups: number;
    avgTeamSize: number;
    elo: number;
    rankingAlgorithm: 'AVERAGE' | 'ELO';
    isUnranked: boolean;
    name: string;
}

// shown until a scope's data has loaded
const emptyScope: Omit<ScopeInfo, 'name'> = {
    minMatchesRequiredToBeRanked: 0,
    placement: { rank: 0, tied: false },
    matches: [],
    matchesWon: 0,
    points: 0,
    cups: 0,
    avgTeamSize: 1,
    elo: 0,
    rankingAlgorithm: 'ELO',
    isUnranked: true,
};

export interface PlayerScreenProps {
    isPending: boolean;
    id: string;
    profileId: string;

    name: string;
    avatarUrl?: string | null;

    hasPremium?: boolean;

    pastSeasons: number;

    /** missing for a player who can't be deleted: already deleted, or of a past season */
    onDelete?: () => void;
    onUploadAvatarPress: () => void;
    onDeleteAvatarPress: () => void;
    /** the player's score clips, oldest first; Versus TV plays one when they score */
    scoreClips: string[];
    isUploadingScoreClip: boolean;
    onUploadScoreClipPress: () => void;
    refresh: RefreshProps;

    scopes: Map<string, ScopeInfo>;
}
export default function PlayerScreen({
    isPending,
    id,
    profileId,
    name,
    avatarUrl,
    pastSeasons,
    onDelete,
    onUploadAvatarPress,
    onDeleteAvatarPress,
    scoreClips,
    isUploadingScoreClip,
    onUploadScoreClipPress,
    refresh,

    scopes,
}: PlayerScreenProps) {
    const scopePicker = useScopePicker();
    const newDesign = useNewDesign();

    const rankingAlgorithm = scopePicker.rankingAlgorithm;

    const theme = useTheme();

    const nav = useNavigation();

    const [editable, setEditable] = useState(false);

    const insets = useInsets(true);
    // Clears the scope picker that floats over the end of the list.
    const listPaddingBottom = insets.bottom + 72;

    const [fade] = useState(() => new Animated.Value(0));
    const [scale] = useState(() => new Animated.Value(0));

    const [inspectAvatar, setInspectAvatar] = useState(false);

    // Stays true after `inspectAvatar` turns false until the close animation finishes.
    const [show, setShow] = useState(false);
    if (inspectAvatar && !show) {
        setShow(true);
    }

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasonss = getPastSeasons(seasonsQuery.data?.data);

    const leaderboardSwiper = useControlledSwiper(
        scopePicker.leaderboardSwiperProgress
    );
    const pastSeasonsSwiper = useControlledSwiper(
        scopePicker.pastSeasonsSwiperProgress
    );

    const groupHasPastSeasons = pastSeasons > 0;

    useEffect(() => {
        if (inspectAvatar) {
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
                }}
            />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant={editable ? 'done' : 'plain'}
                    disabled={isPending}
                    onPress={() => setEditable((prev) => !prev)}
                >
                    {editable ? 'Done' : 'Edit'}
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
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
                                    style={{
                                        paddingHorizontal: newDesign ? 16 : 0,
                                    }}
                                    contentContainerStyle={{
                                        paddingTop: insets.top,
                                        paddingBottom: listPaddingBottom,
                                    }}
                                    ListHeaderComponent={
                                        <>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    setInspectAvatar(true)
                                                }
                                            >
                                                <PlayerPageHeadSection
                                                    {...scopes.get(obj.id)!}
                                                    avatarUrl={avatarUrl}
                                                    profileId={profileId}
                                                    name={name}
                                                    editable={editable}
                                                    onUploadAvatarPress={
                                                        onUploadAvatarPress
                                                    }
                                                    rankingAlgorithm={
                                                        rankingAlgorithm ??
                                                        scopes.get(obj.id)!
                                                            .rankingAlgorithm
                                                    }
                                                />
                                            </TouchableOpacity>
                                        </>
                                    }
                                    matches={scopes.get(obj.id)!.matches}
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
                            style={{ paddingHorizontal: newDesign ? 16 : 0 }}
                            contentContainerStyle={{
                                paddingTop: insets.top,
                                paddingBottom: listPaddingBottom,
                            }}
                            ListHeaderComponent={
                                <>
                                    <TouchableOpacity
                                        onPress={() => setInspectAvatar(true)}
                                    >
                                        <PlayerPageHeadSection
                                            {...scopes.get('today')!}
                                            avatarUrl={avatarUrl}
                                            profileId={profileId}
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
                            style={{ paddingHorizontal: newDesign ? 16 : 0 }}
                            contentContainerStyle={{
                                paddingTop: insets.top,
                                paddingBottom: listPaddingBottom,
                            }}
                            ListHeaderComponent={
                                <>
                                    <TouchableOpacity
                                        onPress={() => setInspectAvatar(true)}
                                    >
                                        <PlayerPageHeadSection
                                            {...(scopes.get('season') ??
                                                emptyScope)}
                                            avatarUrl={avatarUrl}
                                            profileId={profileId}
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
                                style={{
                                    paddingHorizontal: newDesign ? 16 : 0,
                                }}
                                contentContainerStyle={{
                                    paddingTop: insets.top,
                                    paddingBottom: listPaddingBottom,
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
                                                profileId={profileId}
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
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom + 32,
                        paddingHorizontal: 16,
                    }}
                    refreshControl={<RefreshControl {...refresh} />}
                >
                    <PlayerPageHeadSection
                        avatarUrl={avatarUrl}
                        placement={{ rank: 0, tied: false }} // doesn't get shown because this is only ever editable
                        name={name}
                        elo={0} // doesn't get shown because this is only ever editable
                        matchesWon={0} // doesn't get shown because this is only ever editable
                        points={0} // doesn't get shown because this is only ever editable
                        cups={0} // doesn't get shown because this is only ever editable
                        avgTeamSize={1} // doesn't get shown because this is only ever editable
                        isUnranked={false} // doesn't get shown because this is only ever editable
                        editable
                        onUploadAvatarPress={onUploadAvatarPress}
                        matches={[]} // doesn't get shown because this is only ever editable
                        rankingAlgorithm={rankingAlgorithm!}
                    />
                    <MenuSection noFlex>
                        <MenuItem
                            border={false}
                            title={name}
                            headIcon="pencil-outline"
                            onPress={() =>
                                nav.navigate('editPlayerName', { id })
                            }
                            tailIconType="next"
                        />
                        {avatarUrl && (
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
                        )}
                    </MenuSection>
                    <MenuSection
                        noFlex
                        title="Score Clips"
                        titleTailIcon={
                            scoreClips.length ? (
                                <Text color="secondary">
                                    {`${scoreClips.length} of ${MAX_SCORE_CLIPS}`}
                                </Text>
                            ) : undefined
                        }
                        footer={
                            isUploadingScoreClip
                                ? "Uploading… keep Versus open until it's done."
                                : scoreClips.length < MAX_SCORE_CLIPS
                                  ? 'Versus TV plays one at random when they score. Up to 10 seconds each.'
                                  : 'Versus TV plays one at random when they score. Remove one to add another.'
                        }
                    >
                        <ScoreClipTiles
                            clips={scoreClips}
                            isUploading={isUploadingScoreClip}
                            disabled={isPending}
                            onClipPress={(index) =>
                                nav.navigate('scoreClips', { id, index })
                            }
                            onAddPress={
                                scoreClips.length < MAX_SCORE_CLIPS
                                    ? onUploadScoreClipPress
                                    : undefined
                            }
                        />
                    </MenuSection>
                    {onDelete && (
                        <MenuSection noFlex containerStyle={{ marginTop: 24 }}>
                            <MenuItem
                                border={false}
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
                        </MenuSection>
                    )}
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
                <View
                    style={{
                        position: 'absolute',

                        left: 0,
                        right: 0,
                        bottom: 0,
                    }}
                >
                    <LeaderboardScopePicker />

                    <View style={{ height: insets.bottom + 4 }} />
                </View>
            )}
        </GestureHandlerRootView>
    );
}
