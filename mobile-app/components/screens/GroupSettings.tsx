import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Switch } from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';

import { useNavigation } from '@/app/navigation/useNavigation';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';
import { formatGroupCode } from '@/utils/groupCode';

import ConfirmationModal from '../ConfirmationModal';
import copyToClipboard from '../copyToClipboard';

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
    const [isRefreshing, setIsRefreshing] = useState(false);

    const nav = useNavigation();

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 2000);
    }, []);

    const [showChangeWallpaperModal, setShowChangeWallpaperModal] =
        useState(false);

    return (
        <RootSiblingParent>
            <ScrollView
                style={{
                    flex: 1,
                    paddingHorizontal: 16,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{ paddingBottom: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <MenuSection title="Settings">
                    <MenuItem
                        title="Premium Version"
                        headIcon="check-decagram"
                        tailIconType="next"
                        onPress={() => nav.navigate('static/aboutPremium')}
                    />
                    <MenuItem
                        title={groupName}
                        headIcon="pencil-outline"
                        tailIconType="next"
                        onPress={() => nav.navigate('editGroupName', { id })}
                    />
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
                    <MenuItem
                        title="Push Notifications"
                        headIcon="bell-outline"
                        tailContent={
                            <Switch value={pushNotificationsEnabled} />
                        }
                    />
                </MenuSection>
                <MenuSection title="Management">
                    <MenuItem
                        title="Past Seasons"
                        headIcon="pencil-outline"
                        tailIconType="next"
                        tailContent={pastSeasons}
                        onPress={() => nav.navigate('pastSeasons')}
                    />
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
                    <MenuItem
                        title="View Statistics"
                        headIcon="equalizer"
                        tailIconType="next"
                    />
                    <MenuItem
                        title="Create new Player"
                        headIcon="account-plus-outline"
                        tailIconType="next"
                        onPress={() => nav.navigate('createNewPlayer')}
                    />
                    <MenuItem
                        title="Rank Players by"
                        headIcon="division"
                        tailIconType="next"
                        tailContent="Average Points Scored"
                        onPress={() => nav.navigate('editRankPlayersBy')}
                    />
                </MenuSection>
                <MenuSection title="Access">
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
                    <MenuItem
                        title="Code"
                        headIcon="share-outline"
                        tailIconType="next"
                        tailContent={formatGroupCode(groupCode)}
                        onPress={() => copyToClipboard(groupCode)}
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
                {__DEV__ && (
                    <MenuSection title="Development">
                        <MenuItem
                            title="Go to Onboarding"
                            headIcon="dev-to"
                            tailIconType="next"
                            onPress={() => nav.navigate('onboarding')}
                        />
                        <MenuItem
                            title="Has Premium"
                            headIcon="dev-to"
                            tailContent={<Switch value={false} />}
                        />
                    </MenuSection>
                )}
            </ScrollView>
        </RootSiblingParent>
    );
}
