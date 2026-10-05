import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Switch } from 'react-native';

import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useInsets } from '@/lib/useInsets';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export default function Page() {
    const {
        beerpongProMode,
        toggleBeerpongProMode,
        premiumVersion,
        togglePremiumVersion,
        showWallpaper,
        toggleShowWallpaper,
        newDesign,
        toggleNewDesign,
        trackMisses,
        toggleTrackMisses,
    } = useLocalSettings();

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Experimental Features',
                }}
            />
            <AppBackground />
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingTop: useInsets(true).top,
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <MenuSection footer="A redesign of the leaderboard, matches, new match and player pages. Turn it off any time to go back.">
                    <MenuItem
                        border={false}
                        title="New Design"
                        tailContent={
                            <Switch
                                value={newDesign}
                                onChange={toggleNewDesign}
                            />
                        }
                    />
                </MenuSection>
                <MenuSection>
                    <MenuItem
                        border={false}
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
                        title="Group Wallpaper"
                        tailContent={
                            <Switch
                                value={showWallpaper}
                                onChange={toggleShowWallpaper}
                            />
                        }
                    />
                </MenuSection>
                <MenuSection footer="Pro mode: a Miss button on a live match's cups page. Enter every throw, hit or miss, to get hit rates and turns.">
                    <MenuItem
                        border={false}
                        title="Track Misses"
                        tailContent={
                            <Switch
                                value={trackMisses}
                                onChange={toggleTrackMisses}
                            />
                        }
                    />
                </MenuSection>
            </ScrollView>
        </>
    );
}
