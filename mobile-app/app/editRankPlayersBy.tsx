import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';

import InputModal from '@/components/InputModal';
import Select from '@/components/Select';

import { HeaderItem } from './(tabs)/HeaderItem';
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
                    footer={
                        <Text
                            onPress={() => {
                                // close the modal
                                nav.goBack();
                                nav.navigate('aboutTheEloAlgorithm');
                            }}
                            style={{
                                fontSize: 13,
                                lineHeight: 16,
                                fontWeight: 400,
                                // color: '#A7A7A7',

                                color: '#6291F3',

                                paddingHorizontal: 16,
                                paddingVertical: 11,
                            }}
                        >
                            Learn more about the Elo algorithm
                        </Text>
                    }
                />
            </InputModal>
        </>
    );
}
