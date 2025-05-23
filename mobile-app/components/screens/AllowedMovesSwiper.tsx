import { Stack, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    TextInput as ReactNativeTextInput,
    ScrollView,
    Switch,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { Swiper, useSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';
import {
    NewSeasonMoveInput,
    useNewSeasonDraft,
} from '@/zustand/utils/newSeasonDraftStore';

export interface AllowedMovesSwiperProps {
    allowedMoves: NewSeasonMoveInput[];
    initialId: string;
}

export default function AllowedMovesSwiper({
    allowedMoves,
    initialId,
}: AllowedMovesSwiperProps) {
    const nav = useNavigation();

    const [isEditing, setIsEditing] = useState(true);

    const swiper = useSwiper({
        initialPage: allowedMoves.findIndex((i) => i.id === initialId),
    });

    const seasonDraft = useNewSeasonDraft();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Allowed Moves',
                    // headerLeft: () =>
                    //     isEditing ? (
                    //         <HeaderItem onPress={() => setIsEditing(false)}>
                    //             Cancel
                    //         </HeaderItem>
                    //     ) : (
                    //         <HeaderItem onPress={() => nav.goBack()}>
                    //             Close
                    //         </HeaderItem>
                    //     ),
                    // headerRight: () => (
                    //     <HeaderItem
                    //         isLoading={isPending}
                    //         onPress={async () => {
                    //             if (!isEditing) {
                    //                 setIsEditing(true);
                    //             } else {
                    //                 // store gets automatically reset when the `rules` props changes, triggering the `useEffect` in this file
                    //                 await onSubmit(editRulesStore.rules);

                    //                 setIsEditing(false);
                    //             }
                    //         }}
                    //         disabled={isEditing && !editRulesStore.isDirty}
                    //     >
                    //         {isEditing ? 'Save' : 'Edit'}
                    //     </HeaderItem>
                    // ),
                }}
            />
            <Swiper
                {...swiper}
                style={{ backgroundColor: theme.panel.dark.bg }}
            >
                {allowedMoves.map((move) => {
                    return (
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: 32 }}
                            key={move.id}
                        >
                            <InputModal>
                                <Icon
                                    name="bullseye-arrow"
                                    size={64}
                                    color={theme.color.text.primary}
                                    style={{
                                        marginHorizontal: 'auto',
                                    }}
                                />
                                <View
                                    style={{
                                        gap: 16,
                                    }}
                                >
                                    {isEditing && (
                                        <>
                                            <TextInput
                                                defaultValue={move.name}
                                                required
                                                placeholder="Rule Title"
                                                onChangeText={(name) => {
                                                    seasonDraft.actions.setNewSeasonAllowedMoves(
                                                        allowedMoves.map((i) =>
                                                            i.id === move.id
                                                                ? {
                                                                      ...i,
                                                                      name,
                                                                  }
                                                                : i
                                                        )
                                                    );
                                                }}
                                                style={{
                                                    alignSelf: 'stretch',
                                                }}
                                            />

                                            <MenuSection>
                                                <MenuItem
                                                    title="Points for Scorer"
                                                    headIcon="account-outline"
                                                    tailContent={
                                                        <NumberInput
                                                            defaultValue={
                                                                move.pointsForScorer
                                                            }
                                                            onChange={(
                                                                value
                                                            ) => {
                                                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                                                    allowedMoves.map(
                                                                        (i) =>
                                                                            i.id ===
                                                                            move.id
                                                                                ? {
                                                                                      ...i,
                                                                                      pointsForScorer:
                                                                                          value,
                                                                                  }
                                                                                : i
                                                                    )
                                                                );
                                                            }}
                                                        />
                                                    }
                                                    tailIconType="next"
                                                />
                                                <MenuItem
                                                    title="Points for Team"
                                                    headIcon="account-group-outline"
                                                    tailContent={
                                                        <NumberInput
                                                            defaultValue={
                                                                move.pointsForTeam
                                                            }
                                                            onChange={(
                                                                value
                                                            ) => {
                                                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                                                    allowedMoves.map(
                                                                        (i) =>
                                                                            i.id ===
                                                                            move.id
                                                                                ? {
                                                                                      ...i,
                                                                                      pointsForTeam:
                                                                                          value,
                                                                                  }
                                                                                : i
                                                                    )
                                                                );
                                                            }}
                                                        />
                                                    }
                                                    tailIconType="next"
                                                />
                                                <MenuItem
                                                    title="Finish Move"
                                                    headIcon="crown-outline"
                                                    tailContent={
                                                        <Switch
                                                            value={
                                                                move.finishingMove
                                                            }
                                                            onValueChange={(
                                                                finishingMove
                                                            ) => {
                                                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                                                    allowedMoves.map(
                                                                        (i) =>
                                                                            i.id ===
                                                                            move.id
                                                                                ? {
                                                                                      ...i,
                                                                                      finishingMove,
                                                                                  }
                                                                                : i
                                                                    )
                                                                );
                                                            }}
                                                        />
                                                    }
                                                />

                                                <MenuItem
                                                    title="Delete Move"
                                                    headIcon="delete-outline"
                                                    onPress={() => {
                                                        seasonDraft.actions.setNewSeasonAllowedMoves(
                                                            allowedMoves.filter(
                                                                (i) =>
                                                                    i.id !==
                                                                    move.id
                                                            )
                                                        );
                                                    }}
                                                    type="danger"
                                                    confirmationPrompt={{
                                                        title: 'Delete Move',
                                                        description:
                                                            'Are you sure you want to delete this move?',
                                                    }}
                                                />
                                            </MenuSection>
                                        </>
                                    )}
                                    {!isEditing && (
                                        <>
                                            <Text
                                                color="primary"
                                                style={{
                                                    fontSize: 25,

                                                    marginBottom: 16,

                                                    textAlign: 'center',
                                                }}
                                            >
                                                {move.name}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </InputModal>
                        </ScrollView>
                    );
                })}
            </Swiper>
        </>
    );
}

const NumberInput: React.FC<{
    defaultValue: number;
    onChange: (value: number) => void;
}> = ({ defaultValue, onChange }) => {
    const ref = useRef<ReactNativeTextInput>(null);

    function selectEverything() {
        setTimeout(() => {
            ref.current?.setNativeProps({
                selection: {
                    start: 0,
                    end: defaultValue.toString().length,
                },
            });
        }, 0);
    }

    return (
        <ReactNativeTextInput
            ref={ref}
            style={{
                color: theme.color.text.secondary,

                fontSize: 17,
                lineHeight: 22,
                fontWeight: 400,

                textAlign: 'right',

                flexGrow: 1,
            }}
            cursorColor={theme.color.text.primary}
            placeholderTextColor={theme.icon.secondary}
            selectionColor={theme.color.text.primary}
            placeholder={defaultValue.toString()}
            defaultValue={defaultValue.toString()}
            keyboardType="numeric"
            onChangeText={(text) => {
                const value = parseInt(text);
                if (!isNaN(value)) {
                    onChange(value);
                }
            }}
            onFocus={selectEverything}
        />
    );
};
