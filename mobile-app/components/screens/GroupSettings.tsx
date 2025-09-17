import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';

import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { AppBackground } from '@/app/Background';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { SeasonSettings } from '@/openapi/openapi';
import { formatGroupCode } from '@/utils/groupCode';
import { useLocalSettings } from '@/zustand/localSettingsStore';

const formatTeamSize = (seasonSettings?: SeasonSettings) => {
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
    pushNotificationsEnabled: boolean;

    pastSeasons: number;

    groupCode: string;
    onUploadWallpaperPress: () => void;
    onDeleteWallpaperPress: () => void;
    onLeaveGroup: () => void;
    wallpaperAsset?: { url?: string | null } | null;
}
export default function GroupSettingsScreen({
    id,
    hasPremium,
    groupName,
    pushNotificationsEnabled,
    pastSeasons,
    groupCode,
    onLeaveGroup,

    wallpaperAsset,
    onUploadWallpaperPress,
    onDeleteWallpaperPress,
}: GroupSettingsProps) {
    const nav = useNavigation();

    const [showChangeWallpaperModal, setShowChangeWallpaperModal] =
        useState(false);

    const experiments = useLocalSettings();

    const { groupId, seasonId, group } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const insets = useInsets(true, true);

    const allowedMoves = movesQuery.data?.data ?? [];

    return (
        <RootSiblingParent>
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
                <SafeAreaView>
                    <MenuSection title="Settings">
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
                        <MenuItem
                            title={groupName}
                            headIcon="pencil-outline"
                            tailIconType="next"
                            onPress={() =>
                                nav.navigate('editGroupName', { id })
                            }
                        />
                        {experiments.showWallpaper && (
                            <MenuItem
                                title="Set Wallpaper"
                                headIcon="image-multiple"
                                tailIconType="next"
                                onPress={() =>
                                    wallpaperAsset?.url
                                        ? setShowChangeWallpaperModal(true)
                                        : onUploadWallpaperPress()
                                }
                            />
                        )}
                        <ConfirmationModal
                            onClose={() => setShowChangeWallpaperModal(false)}
                            title="Group Wallpaper"
                            actions={
                                [
                                    {
                                        title: 'Upload',
                                        type: 'confirm',

                                        onPress: () => {
                                            onUploadWallpaperPress();
                                            setShowChangeWallpaperModal(false);
                                        },
                                    },
                                    {
                                        title: 'Remove',
                                        type: 'danger',

                                        onPress: () => {
                                            onDeleteWallpaperPress();
                                            setShowChangeWallpaperModal(false);
                                        },
                                    },
                                ] as const
                            }
                            isVisible={showChangeWallpaperModal}
                        />
                        {env.isDev && (
                            <MenuItem
                                title="Push Notifications"
                                headIcon="bell-outline"
                                tailContent={
                                    <Switch value={pushNotificationsEnabled} />
                                }
                            />
                        )}
                    </MenuSection>
                    <MenuSection title="Gameplay">
                        <MenuItem
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
                        {env.isDev && (
                            <MenuItem
                                title="View Statistics"
                                headIcon="equalizer"
                                tailIconType="next"
                            />
                        )}
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
                        <MenuItem
                            title="Rank Players by"
                            headIcon="division"
                            tailIconType="next"
                            tailContent={
                                group.data?.activeSeason?.seasonSettings
                                    ?.rankingAlgorithm === 'AVERAGE'
                                    ? 'Average Points Scored'
                                    : 'Elo'
                            }
                            onPress={() => nav.navigate('editRankPlayersBy')}
                        />
                        <MenuItem
                            title="Min Matches to Qualify"
                            headIcon="account-lock-open"
                            tailIconType="next"
                            tailContent={
                                group.data?.activeSeason?.seasonSettings
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
                                group.data?.activeSeason?.seasonSettings
                            )}
                            tailIconType="next"
                            onPress={() => nav.navigate('teamSizeSettings')}
                        />
                        <MenuItem
                            title="Daily Leaderboard"
                            headIcon="calendar-today"
                            tailContent={(() => {
                                if (
                                    group.data?.activeSeason?.seasonSettings
                                        ?.dailyLeaderboard === 'WAKE_TIME'
                                ) {
                                    return `Resets at ${group.data?.activeSeason?.seasonSettings.wakeTimeHour}:00`;
                                }
                                if (
                                    group.data?.activeSeason?.seasonSettings
                                        ?.dailyLeaderboard ===
                                    'RESET_AT_MIDNIGHT'
                                ) {
                                    return 'Resets at 0:00';
                                }
                                if (
                                    group.data?.activeSeason?.seasonSettings
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
                        {env.isDev && (
                            <>
                                <MenuItem
                                    title="Group Link"
                                    headIcon="link-variant"
                                    tailIconType="copy"
                                />
                                <MenuItem
                                    title="Send Invitation"
                                    headIcon="share-outline"
                                    tailIconType="next"
                                />
                                <MenuItem
                                    title="Show QR Code"
                                    headIcon="qrcode"
                                    tailIconType="next"
                                />
                                <MenuItem
                                    title="Screencast Leaderboard"
                                    headIcon="television"
                                    tailIconType="next"
                                />
                            </>
                        )}
                        <MenuItem
                            title="Code"
                            headIcon="share-outline"
                            tailIconType="next"
                            tailContent={formatGroupCode(groupCode)}
                            onPress={() =>
                                copyToClipboard(formatGroupCode(groupCode))
                            }
                        />
                    </MenuSection>
                    <MenuSection
                        style={{
                            width: '100%',

                            marginTop: 24,
                        }}
                    >
                        <MenuItem
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
                </SafeAreaView>
            </ScrollView>
        </RootSiblingParent>
    );
}
