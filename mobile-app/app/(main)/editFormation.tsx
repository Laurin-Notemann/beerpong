import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CupGrid from '@/components/CupGrid';
import { FormationType } from '@/components/CupGrid/Formation';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import TextInput from '@/components/TextInput';
import { CUP_FORMATION } from '@/lib/cupHits';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';
import { useFormationStore } from '@/zustand/formationStore';

/** Creates a formation, or edits the one with `id`. */
export default function EditFormation() {
    const { id } = useLocalSearchParams<{ id?: string }>();

    const nav = useNavigation();
    const theme = useTheme();
    const insets = useInsets(true);

    const saved = useFormationStore((s) =>
        s.formations.find((i) => i.id === id)
    );
    const { save, remove } = useFormationStore((s) => s.actions);

    const [name, setName] = useState(saved?.name ?? '');
    const [formation, setFormation] = useState<FormationType>({
        ...CUP_FORMATION,
        cups: saved?.cups ?? CUP_FORMATION.cups,
    });

    function onDone() {
        if (!name.trim()) {
            showErrorToast('Give the formation a name.');
            return;
        }
        if (formation.cups.length === 0) {
            showErrorToast('A formation needs at least one cup.');
            return;
        }
        save({
            id: saved?.id ?? String(Date.now()),
            name: name.trim(),
            cups: formation.cups.map(({ x, y }) => ({ x, y })),
        });
        nav.goBack();
    }

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: saved ? 'Edit Formation' : 'New Formation',
                }}
            />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button variant="done" onPress={onDone}>
                    Done
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
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
                    <TextInput
                        placeholder="Formation Name"
                        value={name}
                        onChangeText={setName}
                    />
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
                            Tap to add or remove cups, or move them by dragging.{' '}
                            {formation.cups.length}{' '}
                            {formation.cups.length === 1 ? 'cup' : 'cups'}.
                        </Text>
                        <CupGrid
                            width={300}
                            canEdit
                            formation={formation}
                            onChange={setFormation}
                        />
                    </View>
                    {saved && (
                        <MenuSection
                            style={{
                                marginTop: 48,

                                alignSelf: 'stretch',
                            }}
                        >
                            <MenuItem
                                border={false}
                                title="Delete Formation"
                                headIcon="delete-outline"
                                onPress={() => {
                                    remove(saved.id);
                                    nav.goBack();
                                }}
                                type="danger"
                                confirmationPrompt={{
                                    title: 'Delete Formation',
                                    description:
                                        'Are you sure you want to delete this formation?',
                                }}
                            />
                        </MenuSection>
                    )}
                </GestureHandlerRootView>
            </ScrollView>
        </>
    );
}
