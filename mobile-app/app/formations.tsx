import { Stack } from 'expo-router';
import React from 'react';
import { Dimensions, Text, TouchableHighlight, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import CupGrid from '@/components/CupGrid';
import { HeaderItem } from '@/components/HeaderItem';
import { useTheme } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// eslint-disable-next-line no-empty-pattern
function Item() {
    const size = Math.floor((SCREEN_WIDTH - 32 - 16) / 3);

    const nav = useNavigation();

    const theme = useTheme();

    return (
        <TouchableHighlight
            style={{
                alignItems: 'center',
                justifyContent: 'center',

                gap: 8,

                width: size,
                height: size,

                borderRadius: 10,

                backgroundColor: theme.panel.light.bg,
            }}
            underlayColor={theme.panel.dark.active}
            onPress={() => nav.navigate('editFormation')}
        >
            <>
                <CupGrid width={60} showGrid={false} />

                <Text
                    style={{
                        fontSize: 16,
                        color: theme.color.text.primary,
                    }}
                >
                    10x Pyramid
                </Text>
            </>
        </TouchableHighlight>
    );
}

export default function Formations() {
    const insets = useInsets(true);

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Formations',
                    headerRight: () => <HeaderItem>Edit</HeaderItem>,
                }}
            />
            <GestureHandlerRootView
                style={{
                    flex: 1,
                    backgroundColor: theme.color.bg,

                    paddingTop: insets.top + 16,
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
