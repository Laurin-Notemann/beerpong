import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Switch } from 'react-native';

import { env } from '@/api/env';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import { triggerHapticBump } from '@/haptics';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useTutorials } from '@/zustand/tutorialStore';

export default function Page() {
    const nav = useNavigation();

    const tutorials = useTutorials();

    const insets = useInsets(true);

    const settings = useLocalSettings();

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Settings',
                }}
            />
            <AppBackground />
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <MenuSection title="Appearance">
                    <Select
                        value={settings.themeId}
                        onChange={settings.setTheme}
                        items={[
                            { title: 'Light', value: 'light' },
                            { title: 'Dark', value: 'dark' },
                            {
                                title: 'Dark (Glossy)',
                                value: 'darkWithGloss',
                            },
                        ]}
                    />
                </MenuSection>
                <MenuSection title="Development">
                    <MenuItem
                        border={false}
                        title="Experimental Features"
                        headIcon="flask-outline"
                        tailIconType="next"
                        onPress={() => nav.navigate('experimentalFeatures')}
                    />
                    <MenuItem
                        title="Reset Tutorials"
                        headIcon="flask-outline"
                        tailIconType="next"
                        onPress={() => {
                            tutorials.reset();
                            triggerHapticBump('toast:success');
                        }}
                    />
                    <MenuItem
                        title="Debug"
                        headIcon="dev-to"
                        tailIconType="next"
                        onPress={() => nav.navigate('debug')}
                    />
                    {env.isDev && (
                        <>
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
                        </>
                    )}
                </MenuSection>
            </ScrollView>
        </>
    );
}
