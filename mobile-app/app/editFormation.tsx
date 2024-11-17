import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavigation } from '@/app/navigation/useNavigation';
import CupGrid from '@/components/CupGrid';
import { Formation } from '@/components/CupGrid/Formation';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

export default function EditFormation() {
    const [cups, setCups] = useState(Formation.Pyramid_10);

    const nav = useNavigation();

    return (
        <View
            style={{
                backgroundColor: theme.color.bg,

                flex: 1,
                alignItems: 'center',

                width: '100%',
            }}
        >
            <GestureHandlerRootView
                style={{
                    backgroundColor: theme.color.bg,

                    flex: 1,
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
                <MenuSection
                    style={{
                        marginTop: 48,

                        alignSelf: 'stretch',
                    }}
                >
                    <MenuItem
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
        </View>
    );
}
