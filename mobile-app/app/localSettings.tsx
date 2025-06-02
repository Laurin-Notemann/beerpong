import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Switch } from 'react-native';

import { env } from '@/api/env';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useTutorials } from '@/zustand/tutorialStore';

export default function Page() {
    const nav = useNavigation();

    const tutorials = useTutorials();

    const insets = useInsets(true);

    const settings = useLocalSettings();

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Settings',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
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
                        title="Debug Logs"
                        headIcon="dev-to"
                        tailIconType="next"
                        onPress={() => nav.navigate('debugLog')}
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
