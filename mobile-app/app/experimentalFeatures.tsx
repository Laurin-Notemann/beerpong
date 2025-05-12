import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Switch } from 'react-native';

import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

import { navStyles } from './navigation/navStyles';

export default function Page() {
    const { liveMatches, toggleLiveMatches } = useLocalSettings();

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: '',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <MenuSection title="Experimental Features">
                    <MenuItem
                        title="Live Matches"
                        tailContent={
                            <Switch
                                value={liveMatches}
                                onChange={toggleLiveMatches}
                            />
                        }
                    />
                </MenuSection>
            </ScrollView>
        </>
    );
}
