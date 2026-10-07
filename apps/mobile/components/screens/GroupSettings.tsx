import React from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { Icon } from '@/components/Icon';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { AppBackground } from '@/lib/Background';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { TOURNAMENT_COLOR, TOURNAMENT_ICON } from '@/lib/tournament';
import { useGroupInvite } from '@/lib/useGroupInvite';
import { useInsets } from '@/lib/useInsets';
import { SeasonSettingsDto } from '@/openapi/openapi';
import { formatGroupCode } from '@/utils/groupCode';
import { formatWakeTime } from '@/utils/wakeTime';
import { useLocalSettings } from '@/zustand/localSettingsStore';

const formatTeamSize = (seasonSettings?: SeasonSettingsDto | null) => {
    if (seasonSettings?.minTeamSize === seasonSettings?.maxTeamSize) {
        if (seasonSettings?.minTeamSize === 1) {
            return 'Exactly One Person';
        }
        return `Exactly ${seasonSettings?.minTeamSize} People`;
    }
    return `${seasonSettings?.minTeamSize} - ${seasonSettings?.maxTeamSize} People`;
};

export interface GroupSettingsProps {
    id: string;
    hasPremium: boolean;

    groupName: string;

    pastSeasons: number;

    groupCode: string;
    onUploadWallpaperPress: () => void;
    onDeleteWallpaperPress: () => void;
    onLeaveGroup: () => void;
    wallpaperAsset?: { url?: string | null } | null;

    isUpdatingWallpaper?: boolean;
}
export default function GroupSettingsScreen({
    id,
    groupName,
    groupCode,
    onLeaveGroup,

    wallpaperAsset,
    onUploadWallpaperPress,
    onDeleteWallpaperPress,
    isUpdatingWallpaper = false,
}: GroupSettingsProps) {
    const nav = useNavigation();
    const invite = useGroupInvite();

    const changeWallpaper = () =>
        Alert.alert('Group Wallpaper', undefined, [
            { text: 'Upload', onPress: onUploadWallpaperPress },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: onDeleteWallpaperPress,
            },
            { text: 'Cancel', style: 'cancel' },
        ]);

    const experiments = useLocalSettings();

    const { groupId, seasonId, activeSeason } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const insets = useInsets(true, true);

    const allowedMoves = movesQuery.data?.data ?? [];

    return (
        <>
            <AppBackground />
            <ScrollView
                style={{
                    flex: 1,
                    paddingHorizontal: 16,
                }}
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 16,
                }}
            >
                <View>
                    <MenuSection title="Settings">
                        <MenuItem
                            border={false}
                            title={groupName}
                            headIcon="pencil-outline"
                            tailIconType="next"
                            onPress={() =>
                                nav.navigate('editGroupName', { id })
                            }
                        />
                        <MenuItem
                            title="TV Remote"
                            headIcon="remote-tv"
                            tailIconType="next"
                            onPress={() => nav.navigate('tvRemote')}
                        />
                        {experiments.premiumVersion && (
                            <MenuItem
                                title="Premium Version"
                                headIcon="check-decagram"
                                tailIconType="next"
                                onPress={() =>
                                    nav.navigate('static/aboutPremium')
                                }
                            />
                        )}
                        {experiments.showWallpaper &&
                            (wallpaperAsset?.url ? (
                                <MenuItem
                                    title="Change Wallpaper"
                                    headIcon="image-multiple"
                                    onPress={changeWallpaper}
                                    tailContent={
                                        isUpdatingWallpaper ? (
                                            <ActivityIndicator />
                                        ) : undefined
                                    }
                                />
                            ) : (
                                <MenuItem
                                    title="Set Wallpaper"
                                    headIcon="image-multiple"
                                    tailIconType="next"
                                    onPress={onUploadWallpaperPress}
                                    tailContent={
                                        isUpdatingWallpaper ? (
                                            <ActivityIndicator />
                                        ) : undefined
                                    }
                                />
                            ))}
                    </MenuSection>
                    <MenuSection title="Tournaments">
                        <MenuItem
                            border={false}
                            title="Tournaments"
                            subtitle="Start a tournament or revisit past brackets"
                            headIcon={
                                <Icon
                                    name={TOURNAMENT_ICON}
                                    size={24}
                                    color={TOURNAMENT_COLOR}
                                />
                            }
                            tailIconType="next"
                            onPress={() => nav.navigate('tournaments')}
                        />
                    </MenuSection>
                    <MenuSection title="Gameplay">
                        <MenuItem
                            border={false}
                            title="Start new Season"
                            headIcon="cached"
                            tailIconType="next"
                            onPress={() => nav.navigate('saveSeason')}
                            confirmationPrompt={{
                                title: 'Start new Season',
                                description:
                                    'This will reset the leaderboard. All matches and the leaderboard can still be viewed in "Past Seasons".',
                                buttonText: 'Start new Season',
                                type: 'confirmBlue',
                            }}
                        />
                        <MenuItem
                            title="Create new Player"
                            headIcon="account-plus-outline"
                            tailIconType="next"
                            onPress={() => nav.navigate('createNewPlayer')}
                        />
                        <MenuItem
                            title="Allowed Moves"
                            headIcon="bullseye-arrow"
                            tailIconType="next"
                            tailContent={allowedMoves.length}
                            onPress={() => nav.navigate('allowedMoves')}
                        />
                        {/* pro mode's quick hit uses it */}
                        {experiments.beerpongProMode && (
                            <MenuItem
                                title="Default Move"
                                headIcon="gesture-tap-hold"
                                tailIconType="next"
                                tailContent={
                                    allowedMoves.find((i) => i.defaultMove)
                                        ?.name ?? 'None'
                                }
                                onPress={() =>
                                    nav.navigate('defaultMoveSettings')
                                }
                            />
                        )}
                        <MenuItem
                            title="Rank Players by"
                            headIcon="division"
                            tailIconType="next"
                            tailContent={
                                activeSeason?.seasonSettings
                                    ?.rankingAlgorithm === 'AVERAGE'
                                    ? 'Average Points Scored'
                                    : 'Elo'
                            }
                            onPress={() => nav.navigate('editRankPlayersBy')}
                        />
                        <MenuItem
                            title="Elo Weights"
                            headIcon="tune-variant"
                            tailIconType="next"
                            tailContent={
                                activeSeason?.seasonSettings?.eloSwing != null
                                    ? `Swing ${activeSeason.seasonSettings.eloSwing}`
                                    : undefined
                            }
                            onPress={() => nav.navigate('eloSettings')}
                        />
                        <MenuItem
                            title="Min Matches to Qualify"
                            headIcon="account-lock-open"
                            tailIconType="next"
                            tailContent={
                                activeSeason?.seasonSettings
                                    ?.minMatchesToQualify
                            }
                            onPress={() =>
                                nav.navigate('minMatchesToQualifySettings')
                            }
                        />
                        <MenuItem
                            title="Team Size"
                            headIcon="account-group-outline"
                            tailContent={formatTeamSize(
                                activeSeason?.seasonSettings
                            )}
                            tailIconType="next"
                            onPress={() => nav.navigate('teamSizeSettings')}
                        />
                        <MenuItem
                            title="Daily Leaderboard"
                            headIcon="calendar-today"
                            tailContent={(() => {
                                if (
                                    activeSeason?.seasonSettings
                                        ?.dailyLeaderboard === 'WAKE_TIME'
                                ) {
                                    return `Resets at ${formatWakeTime(activeSeason?.seasonSettings.wakeTime)}`;
                                }
                                if (
                                    activeSeason?.seasonSettings
                                        ?.dailyLeaderboard ===
                                    'RESET_AT_MIDNIGHT'
                                ) {
                                    return 'Resets at 0:00';
                                }
                                if (
                                    activeSeason?.seasonSettings
                                        ?.dailyLeaderboard === 'LAST_24_HOURS'
                                ) {
                                    return 'Last 24h';
                                }
                            })()}
                            tailIconType="next"
                            onPress={() =>
                                nav.navigate('dailyLeaderboardSettings')
                            }
                        />
                    </MenuSection>
                    <MenuSection title="Access">
                        <MenuItem
                            border={false}
                            title="Code"
                            headIcon="pound"
                            tailIconType="copy"
                            tailContent={formatGroupCode(groupCode)}
                            onPress={invite.copyCode}
                        />
                        <MenuItem
                            title="Share Invite"
                            headIcon="share-outline"
                            tailIconType="next"
                            onPress={invite.shareInvite}
                        />
                    </MenuSection>
                    <MenuSection
                        style={{
                            width: '100%',

                            marginTop: 24,
                        }}
                    >
                        <MenuItem
                            border={false}
                            title="Leave Group"
                            headIcon="exit-to-app"
                            onPress={onLeaveGroup}
                            type="danger"
                            confirmationPrompt={{
                                title: 'Leave Group',
                                description:
                                    'Are you sure you want to leave this group?',
                                buttonText: 'Leave',
                            }}
                        />
                    </MenuSection>
                </View>
            </ScrollView>
        </>
    );
}
