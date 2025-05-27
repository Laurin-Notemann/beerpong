import { Stack, useNavigation } from 'expo-router';
import React, { useRef } from 'react';
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
import TextInput from '@/components/TextInput';
import { useTheme } from '@/theme';
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
    const theme = useTheme();

    const swiper = useSwiper({
        initialPage: allowedMoves.findIndex((i) => i.id === initialId),
    });

    const seasonDraft = useNewSeasonDraft();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Allowed Moves',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Close
                        </HeaderItem>
                    ),
                }}
            />
            <Swiper
                {...swiper}
                style={{ backgroundColor: theme.panel.dark.bg }}
            >
                {allowedMoves.map((move) => {
                    return (
                        <AllowedMovePage
                            key={move.id}
                            move={move}
                            onChangeName={(name) => {
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
                            onChangePointsForScorer={(value) => {
                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                    allowedMoves.map((i) =>
                                        i.id === move.id
                                            ? {
                                                  ...i,
                                                  pointsForScorer: value,
                                              }
                                            : i
                                    )
                                );
                            }}
                            onChangePointsForTeam={(value) => {
                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                    allowedMoves.map((i) =>
                                        i.id === move.id
                                            ? {
                                                  ...i,
                                                  pointsForTeam: value,
                                              }
                                            : i
                                    )
                                );
                            }}
                            onChangeIsFinish={(finishingMove) => {
                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                    allowedMoves.map((i) =>
                                        i.id === move.id
                                            ? {
                                                  ...i,
                                                  finishingMove,
                                              }
                                            : i
                                    )
                                );
                            }}
                            onDelete={() => {
                                seasonDraft.actions.setNewSeasonAllowedMoves(
                                    allowedMoves.filter((i) => i.id !== move.id)
                                );
                                nav.goBack();
                            }}
                        />
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
    const theme = useTheme();

    return (
        <ReactNativeTextInput
            keyboardAppearance={theme.keyboardAppearance}
            ref={ref}
            style={{
                color: theme.color.text.secondary,

                fontSize: 17,
                lineHeight: 22,
                fontWeight: 400,

                textAlign: 'right',

                width: 16 * 3.5,
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

const AllowedMovePage: React.FC<{
    move: NewSeasonMoveInput;
    onChangeName: (name: string) => void;
    onChangePointsForScorer: (points: number) => void;
    onChangePointsForTeam: (points: number) => void;
    onChangeIsFinish: (isFinish: boolean) => void;
    onDelete: () => void;
}> = ({
    move,
    onChangeName,
    onChangePointsForScorer,
    onChangePointsForTeam,
    onChangeIsFinish,
    onDelete,
}) => {
    const theme = useTheme();

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} key={move.id}>
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
                    <TextInput
                        defaultValue={move.name}
                        required
                        placeholder="Rule Title"
                        onChangeText={onChangeName}
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
                                    defaultValue={move.pointsForScorer}
                                    onChange={onChangePointsForScorer}
                                />
                            }
                            tailIconType="next"
                        />
                        <MenuItem
                            title="Points for Team"
                            subtitle="The scorer will get these as well"
                            headIcon="account-group-outline"
                            tailContent={
                                <NumberInput
                                    defaultValue={move.pointsForTeam}
                                    onChange={onChangePointsForTeam}
                                />
                            }
                            tailIconType="next"
                        />
                        <MenuItem
                            title="Finish Move"
                            headIcon="crown-outline"
                            tailContent={
                                <Switch
                                    value={move.finishingMove}
                                    onValueChange={onChangeIsFinish}
                                />
                            }
                        />

                        <MenuItem
                            title="Delete Move"
                            headIcon="delete-outline"
                            onPress={onDelete}
                            type="danger"
                            confirmationPrompt={{
                                title: 'Delete Move',
                                description:
                                    'Are you sure you want to delete this move?',
                            }}
                        />
                    </MenuSection>
                </View>
            </InputModal>
        </ScrollView>
    );
};
