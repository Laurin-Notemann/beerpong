import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';
import Swiper from 'react-native-swiper';

import Leaderboard from '@/components/Leaderboard';
import { mockPlayers } from '@/components/mockData/players';
import SwiperHeader from '@/components/SwiperHeader';
// import ReactNativeHapticFeedback from "react-native-haptic-feedback";
// import Carousel from "react-native-snap-carousel";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { theme } from '@/theme';

import { HeaderItem } from './(tabs)/HeaderItem';
import { navStyles } from './navigation/navStyles';

const { width } = Dimensions.get('window');

function Card() {
    const players = mockPlayers;

    return (
        <ThemedView style={styles.card}>
            <ThemedText
                type="title"
                style={{
                    fontSize: 25,
                    color: theme.color.text.primary,
                    marginTop: 48,
                }}
            >
                Kroatien
            </ThemedText>
            <ThemedText
                style={{
                    fontSize: 12,
                    color: theme.color.text.secondary,
                    marginTop: 3,
                }}
            >
                9.9.2024 - 16.9.2024
            </ThemedText>
            <ThemedText
                style={{
                    fontSize: 17,
                    color: theme.color.text.secondary,
                    marginTop: 32 - 6,
                }}
            >
                {players.length} players · 78 matches
            </ThemedText>
            <Leaderboard players={players} />
        </ThemedView>
    );
}

export default function Screen() {
    const [cardIdx, setCardIdx] = useState(0);

    function onSwiped(idx: number) {
        setCardIdx(idx);
    }

    // if (EXPERIMENTAL_CAROUSEL) {
    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Past Seasons',
                    headerRight: () => <HeaderItem>Done</HeaderItem>,
                }}
            />

            <Carousel
                mode="parallax"
                modeConfig={{
                    parallaxScrollingScale: 0.9,
                    parallaxScrollingOffset: 50,
                }}
                style={{
                    // width: width * 0.86,

                    backgroundColor: theme.color.bg,
                }}
                loop={false}
                width={width}
                height={1000}
                data={[0, 0, 0, 0, 0]}
                renderItem={(item) => <Card />}
                // sliderWidth={Dimensions.get("screen").width}
                // itemWidth={Dimensions.get("screen").width - 32}
            />
        </>
    );
    // }

    return (
        // <ParallaxScrollView
        //   headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        //   headerImage={
        //     <Ionicons size={310} name="code-slash" style={styles.headerImage} />
        //   }
        // >
        <Animated.ScrollView style={{ backgroundColor: theme.color.bg }}>
            <ThemedView
                style={{
                    flex: 1,
                    paddingBottom: 16,
                }}
            >
                {/* <ThemedView>
        <SwiperHeader
        // currentItemIdx={activeSubexpenseIdx}
        // numItems={activeSubexpenses.length}
        /> */}
                <SwiperHeader numItems={5} currentItemIdx={cardIdx} />
                <Swiper
                    removeClippedSubviews={false}
                    // contentContainerStyle={{
                    //   paddingHorizontal: 10,
                    // }}
                    // containerStyle={{
                    //   width: width * 0.9,
                    //   // Center the current item
                    //   alignSelf: "center",
                    // }}
                    // contentContainerStyle={{ width: 100, flex: 0 }}
                    // contentInset={{ left: 64 }}
                    // contentOffset={{ x: 64, y: 0 }}
                    style={
                        {
                            // backgroundColor: "red",
                        }
                    }
                    showsButtons={false}
                    showsPagination={false}
                    loop={false}
                    // index={activeSubexpenseIdx}
                    // onIndexChanged={onSwiped}
                    index={0}
                    onIndexChanged={(idx) => {
                        // ReactNativeHapticFeedback.trigger("impactLight", {
                        //   enableVibrateFallback: false,
                        //   ignoreAndroidSystemSettings: false,
                        // });
                        onSwiped(idx);
                    }}
                >
                    <Card />
                    <Card />
                    <Card />
                    <Card />
                    <Card />
                </Swiper>
                {/* </ThemedView> */}
            </ThemedView>
        </Animated.ScrollView>
        // </ParallaxScrollView>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        flex: 1,

        borderRadius: theme.borderRadius.card,

        backgroundColor: theme.color.modal.bg,

        marginHorizontal: 16,

        width: 16 * 20,

        // justifyContent: "center",
        // // Make each slide slightly smaller than the full width
        // width: width * 0.8,
    },

    headerImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
    },
});
