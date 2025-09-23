import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import CupGrid from '@/components/CupGrid';
import { Formation } from '@/components/CupGrid/Formation';
import { HeaderItem } from '@/components/HeaderItem';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { useTheme } from '@/theme';

export default function EditFormation() {
    const [cups, setCups] = useState(Formation.Pyramid_10);

    const nav = useNavigation();

    const theme = useTheme();

    const insets = useInsets(true);

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Edit Formation',
                    headerRight: () => <HeaderItem>Done</HeaderItem>,
                }}
            />
            <ScrollView
                style={{
                    backgroundColor: theme.color.bg,

                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingTop: insets.top + 16,
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                }}
            >
                <GestureHandlerRootView
                    style={{
                        flex: 1,
                    }}
                >
                    <View
                        style={{
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: theme.color.text.secondary,
                                fontSize: 13,
                                textAlign: 'center',

                                marginTop: 16,
                                marginBottom: 32,
                            }}
                        >
                            Tap to add or remove cups, or move them by dragging
                        </Text>
                        <CupGrid
                            width={300}
                            canEdit
                            formation={cups}
                            onChange={setCups}
                        />
                    </View>
                    <MenuSection
                        style={{
                            marginTop: 48,

                            alignSelf: 'stretch',
                        }}
                    >
                        <MenuItem
                            border={false}
                            title="Ring of Water"
                            headIcon="pencil-outline"
                            onPress={() => nav.navigate('editFormationName')}
                            tailIconType="next"
                        />
                        <MenuItem
                            title="Delete Formation"
                            headIcon="delete-outline"
                            onPress={() => alert('deleting')}
                            type="danger"
                            confirmationPrompt={{
                                title: 'Delete Formation',
                                description:
                                    'Are you sure you want to delete this formation?',
                            }}
                        />
                    </MenuSection>
                </GestureHandlerRootView>
            </ScrollView>
        </>
    );
}
