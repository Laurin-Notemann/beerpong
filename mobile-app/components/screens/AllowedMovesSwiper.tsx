import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { ScrollView, Switch, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import { MenuItemNumberInput } from '@/components/Menu/MenuItemNumberInput';
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
                        <MenuItemNumberInput
                            title="Points for Scorer"
                            headIcon="account-outline"
                            defaultValue={move.pointsForScorer}
                            onChange={onChangePointsForScorer}
                        />
                        <MenuItemNumberInput
                            title="Points for Team"
                            subtitle="The scorer will get these as well"
                            headIcon="account-group-outline"
                            defaultValue={move.pointsForTeam}
                            onChange={onChangePointsForTeam}
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
