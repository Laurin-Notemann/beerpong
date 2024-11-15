import { Link, useNavigation } from 'expo-router';
import React from 'react';
import { Dimensions, Text, TouchableHighlight, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CupGrid from '@/components/CupGrid';

const SCREEN_WIDTH = Dimensions.get('window').width;

function Item({}: {}) {
    const size = Math.floor((SCREEN_WIDTH - 32 - 16) / 3);

    const nav = useNavigation();

    return (
        // <Link
        //   href="/editFormation"
        //   style={{
        //     width: size,
        //     height: size,
        //   }}
        // >
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
            underlayColor="#3B3B3B" // Lighter color on touch
            // @ts-ignore
            onPress={() => nav.navigate('editFormation')}
        >
            {/* <View
          style={{
            alignItems: "center",
            justifyContent: "center",

            gap: 8,

            width: size,
            height: size,

            borderRadius: 10,

            backgroundColor: "#2E2E2E",

            borderWidth: 1,

            borderColor: "#444444",
          }}
        > */}
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
            {/* </View> */}
        </TouchableHighlight>
        // </Link>
    );
}

export default function Formations() {
    return (
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
    );
}
