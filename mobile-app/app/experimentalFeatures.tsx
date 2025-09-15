import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Switch } from 'react-native';

import { useNavStyles } from '@/app/navigation/navStyles';
import { useInsets } from '@/app/useInsets';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export default function Page() {
    const {
        beerpongProMode,
        toggleBeerpongProMode,
        premiumVersion,
        togglePremiumVersion,
        matchPhotos,
        toggleMatchPhotos,
        showWallpaper,
        toggleShowWallpaper,
        scopedPlayerPage,
        toggleScopedPlayerPage,
    } = useLocalSettings();

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: '',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingTop: useInsets(true).top,
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <MenuSection title="Experimental Features">
                    <MenuItem
                        title="Beerpong Pro Mode"
                        tailContent={
                            <Switch
                                value={beerpongProMode}
                                onChange={toggleBeerpongProMode}
                            />
                        }
                    />
                    <MenuItem
                        title="Premium Version"
                        tailContent={
                            <Switch
                                value={premiumVersion}
                                onChange={togglePremiumVersion}
                            />
                        }
                    />
                    <MenuItem
                        title="Team Photos"
                        tailContent={
                            <Switch
                                value={matchPhotos}
                                onChange={toggleMatchPhotos}
                            />
                        }
                    />
                    <MenuItem
                        title="Group Wallpaper"
                        tailContent={
                            <Switch
                                value={showWallpaper}
                                onChange={toggleShowWallpaper}
                            />
                        }
                    />
                    <MenuItem
                        title="Player Pages for All Time and Today"
                        tailContent={
                            <Switch
                                value={scopedPlayerPage}
                                onChange={toggleScopedPlayerPage}
                            />
                        }
                    />
                </MenuSection>
            </ScrollView>
        </>
    );
}
