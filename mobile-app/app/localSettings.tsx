import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';

import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

export default function Page() {
    const nav = useNavigation();

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Settings',
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
                <MenuSection title="Development">
                    <MenuItem
                        title="Experimental Features"
                        headIcon="flask-outline"
                        tailIconType="next"
                        onPress={() => nav.navigate('experimentalFeatures')}
                    />
                </MenuSection>
            </ScrollView>
        </>
    );
}
