import { Stack } from 'expo-router';
import React, { useState } from 'react';

import InputModal from '@/components/InputModal';
import Select from '@/components/Select';

import { HeaderItem } from './(tabs)/_layout';
import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const [value, setValue] = useState('average');

    async function onValueChange(newValue: string) {
        setValue(newValue);
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Rank Players By',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
                    headerRight: () => (
                        <HeaderItem noMargin onPress={() => nav.goBack()}>
                            Done
                        </HeaderItem>
                    ),
                }}
            />
            <InputModal>
                <Select
                    items={[
                        {
                            value: 'average',
                            title: 'Average Points Scored',
                            subtitle:
                                'Points scored divided by matches played.',
                        },
                        {
                            value: 'elo',
                            title: 'Elo',
                            subtitle:
                                'More balanced algorithm based on relative skill level.',
                        },
                    ]}
                    value={value}
                    onChange={onValueChange}
                    footer="Learn more about the elo algorithm"
                />
            </InputModal>
        </>
    );
}
