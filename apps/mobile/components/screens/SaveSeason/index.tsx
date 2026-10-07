import React, { useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import type { TextInputInstance } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import { SaveSeasonStack } from '@/components/SaveSeasonStack';
import { NewSeasonRulesInput } from '@/components/screens/SaveSeason/NewSeasonRulesInput';
import { OldSeasonNameInput } from '@/components/screens/SaveSeason/OldSeasonNameInput';
import { Swiper, useSwiperWithPageState } from '@/components/Swiper';
import { AppBackground } from '@/lib/Background';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { Components } from '@/openapi/openapi';
import { useNewSeasonDraft } from '@/zustand/utils/newSeasonDraftStore';

export interface SaveSeasonScreenProps {
    oldSeasonMoves: Components.Schemas.RuleMoveDto[];
    onStartNewSeason: (
        oldSeasonName: string,
        newSeasonAllowedMoves: Components.Schemas.RuleMoveCreateDto[]
    ) => void;
    numMatches: number;
    players: Player[];
    oldSeasonStartDate: string;
    onCancel: () => void;
    isCreating: boolean;
    rankingAlgorithm: 'AVERAGE' | 'ELO';
}
export const SaveSeasonScreen: React.FC<SaveSeasonScreenProps> = ({
    onStartNewSeason,
    oldSeasonMoves,
    numMatches,
    players,
    oldSeasonStartDate,
    onCancel,
    isCreating,
    rankingAlgorithm,
}) => {
    const newSeasonDraft = useNewSeasonDraft();

    useEffect(() => {
        newSeasonDraft.actions.clear();
        newSeasonDraft.actions.setNewSeasonAllowedMoves(
            oldSeasonMoves.map((i) => ({
                id: i.id!,
                name: i.name!,
                finishingMove: i.finishingMove!,
                pointsForScorer: i.pointsForScorer!,
                pointsForTeam: i.pointsForTeam!,
                cups: cupsPerHit(i),
                defaultMove: !!i.defaultMove,
            }))
        );
    }, [newSeasonDraft.actions, oldSeasonMoves]);

    const oldSeasonIsEmpty = numMatches < 1;

    const {
        ref: swiperRef,
        swiperProgress,
        swiperPage,
        onPageChange,
        defaultIndex,
    } = useSwiperWithPageState({ initialPage: 0 });

    const hasValidName =
        oldSeasonIsEmpty || newSeasonDraft.oldSeasonName.length > 0;

    const hasValidMoves = newSeasonDraft.newSeasonAllowedMoves.length > 0;

    const nav = useNavigation();

    const oldSeasonNameInputRef = useRef<TextInputInstance>(null);

    return (
        <>
            <SaveSeasonStack
                oldSeasonIsEmpty={oldSeasonIsEmpty}
                isNextDisabled={!hasValidName}
                isCreateDisabled={!(hasValidName && hasValidMoves)}
                animationProgress={swiperProgress}
                onClear={onCancel}
                onBack={() => {
                    swiperRef.current?.prev();
                }}
                onNext={() => {
                    Keyboard.dismiss();
                    swiperRef.current?.next();
                }}
                onCreate={() =>
                    onStartNewSeason(
                        oldSeasonIsEmpty
                            ? 'Empty Season'
                            : newSeasonDraft.oldSeasonName,
                        newSeasonDraft.newSeasonAllowedMoves
                    )
                }
                isCreating={isCreating}
            />
            <AppBackground />
            <Swiper
                ref={swiperRef}
                swiperProgress={swiperProgress}
                defaultIndex={defaultIndex}
                onPageChange={onPageChange}
                enabled={!(swiperPage === 0 && !hasValidName)}
                onScrollStart={() => {
                    oldSeasonNameInputRef.current?.blur();
                }}
            >
                {!oldSeasonIsEmpty && (
                    <OldSeasonNameInput
                        oldSeasonNameInputRef={oldSeasonNameInputRef}
                        numMatches={numMatches}
                        numPlayers={players.length}
                        startDate={oldSeasonStartDate}
                        rankedPlayers={players}
                        onChangeName={(name) => {
                            newSeasonDraft.actions.setOldSeasonName(name);
                        }}
                        rankingAlgorithm={rankingAlgorithm}
                    />
                )}
                <NewSeasonRulesInput
                    moves={newSeasonDraft.newSeasonAllowedMoves}
                    onNewPress={() => {
                        const newMoveId = Date.now().toString();

                        newSeasonDraft.actions.setNewSeasonAllowedMoves([
                            ...newSeasonDraft.newSeasonAllowedMoves,
                            {
                                id: newMoveId,
                                name: 'New Move',
                                finishingMove: false,
                                pointsForScorer: 1,
                                pointsForTeam: 0,
                                cups: 1,
                                defaultMove: false,
                            },
                        ]);
                        nav.navigate('allowedMove', {
                            id: newMoveId,
                        });
                    }}
                    onDelete={(id) =>
                        newSeasonDraft.actions.setNewSeasonAllowedMoves(
                            newSeasonDraft.newSeasonAllowedMoves.filter(
                                (i) => i.id !== id
                            )
                        )
                    }
                    onReorder={newSeasonDraft.actions.setNewSeasonAllowedMoves}
                />
            </Swiper>
        </>
    );
};
