import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import CupGrid from '@/components/CupGrid';
import { flipFormation, Formation } from '@/components/CupGrid/Formation';
import { HeaderItem } from '@/components/HeaderItem';
import LiveMatchCupControls from '@/components/LiveMatchCupControls';
import { theme } from '@/theme';

export default function Screen() {
    const [redCups, setRedCups] = useState(Formation.Pyramid_10);
    const [blueCups, setBlueCups] = useState(
        flipFormation(Formation.Pyramid_10)
    );

    const [isFlipped, setIsFlipped] = useState(false);

    const flipCups = () => setIsFlipped((prev) => !prev);

    const nav = useNavigation();

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Start Live Match',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
                    headerRight: () => (
                        <HeaderItem onPress={() => {}}>Create</HeaderItem>
                    ),
                }}
            />
            <View
                style={{
                    backgroundColor: '#000',

                    alignItems: 'center',
                    flex: 1,
                }}
            >
                <LiveMatchCupControls onFlip={flipCups} />
                <GestureHandlerRootView
                    style={{
                        backgroundColor: 'none',
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
                        Tap a cup to remove it
                    </Text>
                    <View
                        style={{
                            gap: 64,
                            transform: [
                                { rotateX: isFlipped ? '180deg' : '0deg' },
                            ],
                            backgroundColor: 'none',
                        }}
                    >
                        <CupGrid
                            color={theme.color.team.red}
                            width={300}
                            formation={redCups}
                            onCupTap={(cup) =>
                                runOnJS(setRedCups)({
                                    ...redCups,
                                    cups: redCups.cups.filter(
                                        (i) => !(i.x === cup.x && i.y === cup.y)
                                    ),
                                })
                            }
                        />
                        <CupGrid
                            color={theme.color.team.blue}
                            width={300}
                            formation={blueCups}
                            onCupTap={(cup) =>
                                runOnJS(setBlueCups)({
                                    ...blueCups,
                                    cups: blueCups.cups.filter(
                                        (i) => !(i.x === cup.x && i.y === cup.y)
                                    ),
                                })
                            }
                        />
                    </View>
                </GestureHandlerRootView>
            </View>
        </>
    );
}
