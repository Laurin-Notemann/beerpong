import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { useGroup, useStartNewSeasonMutation } from '@/api/calls/seasonHooks';
import InputModal from '@/components/InputModal';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

import { HeaderItem } from './(tabs)/_layout';
import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const [value, setValue] = useState('');

    const nav = useNavigation();

    const { groupId } = useGroup();

    const { mutateAsync } = useStartNewSeasonMutation();

    const qc = useQueryClient();

    async function onStartNewSeason(oldSeasonName: string) {
        if (!groupId) return;
        try {
            await mutateAsync({
                groupId,
                oldSeasonName,
            });
            qc.invalidateQueries({
                queryKey: ['groups', groupId],
                exact: false,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to start new season:', err);
            showErrorToast('Failed to create start new season.');
        }
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Save old Season',
                    headerStyle: {
                        backgroundColor: theme.color.topNav,

                        // @ts-ignore
                        elevation: 0, // For Android
                        shadowOpacity: 0, // For iOS
                        borderBottomWidth: 0, // Removes the border for both platforms
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerRight: () => (
                        <HeaderItem
                            disabled={value.length < 1}
                            onPress={() => onStartNewSeason(value)}
                        >
                            Save
                        </HeaderItem>
                    ),
                }}
            />
            <InputModal>
                <Podium detailed={false} />
                <TextInput
                    required
                    placeholder="Season Name"
                    defaultValue={value}
                    onChangeText={(text) => setValue(text.trim())}
                    autoFocus
                    style={{
                        alignSelf: 'stretch',
                    }}
                />
            </InputModal>
        </>
    );
}
