import { useNavigation } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Switch } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootSiblingParent } from 'react-native-root-siblings';

import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import copyToClipboard from '../copyToClipboard';

export interface GroupSettingsProps {
    hasPremium: boolean;

    groupName: string;
    pushNotificationsEnabled: boolean;

    pastSeasons: number;

    groupCode: string;
}
export default function GroupSettingsScreen({
    hasPremium,
    groupName,
    pushNotificationsEnabled,
    pastSeasons,
    groupCode,
}: GroupSettingsProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const nav = useNavigation();

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 2000);
    }, []);

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
                <MenuSection title="Settings" color="dark">
                    <MenuItem
                        title="Premium Version"
                        headIcon="check-decagram"
                        tailIconType="next"
                        // @ts-ignore
                        onPress={() => nav.navigate('aboutPremium')}
                    />
                    <MenuItem
                        title={groupName}
                        headIcon="pencil-outline"
                        tailIconType="next"
                    />
                    <MenuItem
                        title="Set Wallpaper"
                        headIcon="image-multiple"
                        tailIconType="next"
                        onPress={async () => {
                            const result = await launchImageLibrary({
                                mediaType: 'photo',
                            });
                            // eslint-disable-next-line
                            console.log(result);
                        }}
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
                        // @ts-ignore
                        onPress={() => nav.navigate('pastSeasons')}
                    />
                    <MenuItem
                        title="Start new Season"
                        headIcon="cached"
                        tailIconType="next"
                        // @ts-ignore
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
                        // @ts-ignore
                        onPress={() => nav.navigate('createNewPlayer')}
                    />
                    <MenuItem
                        title="Rank Players by"
                        headIcon="division"
                        tailIconType="next"
                        tailContent="Average Points Scored"
                        // @ts-ignore
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
                        tailContent={groupCode}
                        onPress={() => copyToClipboard(groupCode)}
                    />
                </MenuSection>
                {__DEV__ && (
                    <MenuSection title="Development">
                        <MenuItem
                            title="Go to Onboarding"
                            headIcon="dev-to"
                            tailIconType="next"
                            // @ts-ignore
                            onPress={() => nav.navigate('onboarding')}
                        />
                        <MenuItem
                            title="Go to Empty Leaderboard"
                            headIcon="dev-to"
                            tailIconType="next"
                            // @ts-ignore
                            onPress={() => nav.navigate('onboarding')}
                        />
                        <MenuItem
                            title="Has Premium"
                            headIcon="dev-to"
                            tailContent={
                                <Switch value={pushNotificationsEnabled} />
                            }
                        />
                    </MenuSection>
                )}
            </ScrollView>
        </RootSiblingParent>
    );
}
