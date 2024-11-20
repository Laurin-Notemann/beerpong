import { Stack } from 'expo-router';
import React from 'react';
import { Dimensions, Text, TouchableHighlight, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavigation } from '@/app/navigation/useNavigation';
import CupGrid from '@/components/CupGrid';

import { HeaderItem } from './(tabs)/HeaderItem';
import { navStyles } from './navigation/navStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ItemProps {}
// eslint-disable-next-line no-empty-pattern
function Item({}: ItemProps) {
    const size = Math.floor((SCREEN_WIDTH - 32 - 16) / 3);

    const nav = useNavigation();

    return (
        <TouchableHighlight
            style={{
                alignItems: 'center',
                justifyContent: 'center',

                gap: 8,

                width: size,
                height: size,

                borderRadius: 10,

                backgroundColor: '#2E2E2E',

                borderWidth: 1,

                borderColor: '#444444',
            }}
            underlayColor="#3B3B3B"
            onPress={() => nav.navigate('editFormation')}
        >
            <>
                <CupGrid width={60} showGrid={false} />

                <Text
                    style={{
                        fontSize: 16,
                        color: '#fff',
                    }}
                >
                    10x Pyramid
                </Text>
            </>
        </TouchableHighlight>
    );
}

export default function Formations() {
    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Formations',
                    headerRight: () => <HeaderItem>Edit</HeaderItem>,
                }}
            />
            <GestureHandlerRootView
                style={{
                    flex: 1,
                    backgroundColor: '#000',
                }}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',

                        paddingHorizontal: 16,
                        gap: 8,

                        paddingTop: 48,
                    }}
                >
                    <Item />
                    <Item />
                    <Item />
                    <Item />
                    <Item />
                </View>
            </GestureHandlerRootView>
        </>
    );
}
