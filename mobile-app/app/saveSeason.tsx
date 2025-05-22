import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import Swiper from 'react-native-swiper';

import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup, useStartNewSeasonMutation } from '@/api/calls/seasonHooks';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { AllowedMoves } from '@/components/AllowedMoves';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useNewSeasonDraft } from '@/zustand/utils/newSeasonDraftStore';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const newSeasonMutation = useStartNewSeasonMutation();

    const qc = useQueryClient();

    async function onStartNewSeason(oldSeasonName: string) {
        if (!groupId) return;
        try {
            await newSeasonMutation.mutateAsync({
                groupId,
                oldSeasonName,
            });
            qc.invalidateQueries({
                queryKey: ['groups', groupId],
                exact: false,
            });
            nav.navigate('index');
            showSuccessToast(
                `Saved current leaderboard as "${oldSeasonName}".`
            );
        } catch (err) {
            ConsoleLogger.error('failed to start new season:', err);
            showErrorToast('Failed to create start new season.');
        }
    }

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const newSeasonDraft = useNewSeasonDraft();

    useEffect(() => {
        newSeasonDraft.actions.clear();
        newSeasonDraft.actions.setNewSeasonAllowedMoves(
            allowedMoves.map((i) => ({
                id: i.id!,
                name: i.name!,
                finishingMove: i.finishingMove!,
                pointsForScorer: i.pointsForScorer!,
                pointsForTeam: i.pointsForTeam!,
            }))
        );
    }, []);

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Save old Season',
                    headerRight: () => (
                        <HeaderItem
                            disabled={newSeasonDraft.oldSeasonName.length < 1}
                            isLoading={newSeasonMutation.isPending}
                            onPress={() =>
                                onStartNewSeason(newSeasonDraft.oldSeasonName)
                            }
                        >
                            Save
                        </HeaderItem>
                    ),
                }}
            />
            <Swiper
                // ref={swiperRef}
                showsPagination={false}
                loop={false}
                // index={pageIdx!}
                // onIndexChanged={(value) => {
                //     setTimeout(() => {
                //         // for some reason, onIndexChanged gets fired with 0 when dismissing the modal by clicking outside of it, leading to the modal opening again
                //         // at this point, the component hasn't rerendered yet, so playerIdx will still be a non-null value, so we can't check against that.
                //         // to work around this, we wait 0ms (which actually translates to a short wait) for the playerIdx to change to null.
                //         // we have to use a ref for the playerIdx because we're inside a callback, and the value of playerIdx will be the same as when the callback was created (so non-null).
                //         if (playerIdxRef.current != null)
                //             setPageIdx(value);
                //     }, 0);
                // }}
                style={{ height: 0 }}
            >
                <InputModal>
                    <Podium
                        detailed={false}
                        style={{ marginHorizontal: 'auto' }}
                    />
                    <TextInput
                        required
                        placeholder="Season Name"
                        defaultValue={newSeasonDraft.oldSeasonName}
                        onChangeText={(text) =>
                            newSeasonDraft.actions.setOldSeasonName(text.trim())
                        }
                        autoFocus
                        style={{
                            alignSelf: 'stretch',
                        }}
                    />
                </InputModal>
                <InputModal>
                    <AllowedMoves
                        moves={newSeasonDraft.newSeasonAllowedMoves}
                        onNewPress={() =>
                            newSeasonDraft.actions.setNewSeasonAllowedMoves([
                                ...newSeasonDraft.newSeasonAllowedMoves,
                                {
                                    name: 'New Move',
                                    finishingMove: false,
                                    pointsForScorer: 1,
                                    pointsForTeam: 0,
                                },
                            ])
                        }
                        onDelete={(id) =>
                            newSeasonDraft.actions.setNewSeasonAllowedMoves(
                                newSeasonDraft.newSeasonAllowedMoves.filter(
                                    (i) => i.id !== id
                                )
                            )
                        }
                    />
                </InputModal>
            </Swiper>
        </>
    );
}
