import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import CupGrid from '@/components/CupGrid';
import { flipFormation } from '@/components/CupGrid/Formation';
import LiveMatchCupControls from '@/components/LiveMatchCupControls';
import { theme } from '@/theme';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Screen() {
    const matchDraft = useMatchDraftStore();

    const [isFlipped, setIsFlipped] = useState(false);

    const flipCups = () => setIsFlipped((prev) => !prev);

    const nav = useNavigation();

    const insets = useInsets(true, true);

    return (
        // <>
        //     <Stack.Screen
        //         options={{
        //             ...navStyles,
        //             headerTitle: 'Start Live Match',
        //             headerLeft: () => (
        //                 <HeaderItem onPress={() => nav.goBack()}>
        //                     Cancel
        //                 </HeaderItem>
        //             ),
        //             headerRight: () => (
        //                 <HeaderItem onPress={() => {}}>Create</HeaderItem>
        //             ),
        //         }}
        //     />
        <View
            style={{
                backgroundColor: theme.color.bg,

                alignItems: 'center',
                flex: 1,

                paddingTop: insets.top,
                paddingBottom: insets.bottom,
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
                        transform: [{ rotateX: isFlipped ? '180deg' : '0deg' }],
                        backgroundColor: 'none',
                    }}
                >
                    <CupGrid
                        color={theme.color.team.red}
                        width={300}
                        formation={{
                            ...matchDraft.redTeam.cups.currentFormation,
                            cups: matchDraft.redTeam.cups.currentFormation.cups.map(
                                (i) => ({
                                    ...i,
                                    disabled: i.hitby != null,
                                })
                            ),
                        }}
                        onCupTap={(cup) =>
                            nav.navigate('assignCupHitModal', {
                                x: cup.x,
                                y: cup.y,
                                color: theme.color.team.red,
                            })
                        }
                    />
                    <CupGrid
                        color={theme.color.team.blue}
                        width={300}
                        formation={flipFormation({
                            ...matchDraft.blueTeam.cups.currentFormation,
                            cups: matchDraft.blueTeam.cups.currentFormation.cups.map(
                                (i) => ({
                                    ...i,
                                    disabled: i.hitby != null,
                                })
                            ),
                        })}
                        onCupTap={(cup) =>
                            nav.navigate('assignCupHitModal', {
                                x: cup.x,
                                y: cup.y,
                                color: theme.color.team.blue,
                            })
                        }
                    />
                </View>
            </GestureHandlerRootView>
        </View>
        // </>
    );
}
