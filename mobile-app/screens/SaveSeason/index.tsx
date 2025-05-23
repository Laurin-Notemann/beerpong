import React, { useEffect, useRef } from 'react';
import { TextInput } from 'react-native';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { SaveSeasonStack } from '@/components/SaveSeasonStack';
import { Swiper, useSwiper } from '@/components/Swiper';
import { Components } from '@/openapi/openapi';
import { NewSeasonRulesInput } from '@/screens/SaveSeason/NewSeasonRulesInput';
import { OldSeasonNameInput } from '@/screens/SaveSeason/OldSeasonNameInput';
import { useNewSeasonDraft } from '@/zustand/utils/newSeasonDraftStore';

export interface SaveSeasonScreenProps {
    oldSeasonMoves: Components.Schemas.RuleMoveDto[];
    onStartNewSeason: (
        oldSeasonName: string,
        newSeasonAllowedMoves: Components.Schemas.RuleMoveDto[]
    ) => void;
    numMatches: number;
    players: Player[];
    oldSeasonStartDate: string;
    onCancel: () => void;
    isCreating: boolean;
}
export const SaveSeasonScreen: React.FC<SaveSeasonScreenProps> = ({
    onStartNewSeason,
    oldSeasonMoves,
    numMatches,
    players,
    oldSeasonStartDate,
    onCancel,
    isCreating,
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
            }))
        );
    }, [oldSeasonMoves]);

    const oldSeasonIsEmpty = numMatches < 1;

    const swiper = useSwiper({ initialPage: 0 });

    const hasValidName =
        oldSeasonIsEmpty || newSeasonDraft.oldSeasonName.length > 0;

    const hasValidMoves = newSeasonDraft.newSeasonAllowedMoves.length > 0;

    const nav = useNavigation();

    const oldSeasonNameInputRef = useRef<TextInput>(null);

    return (
        <>
            <SaveSeasonStack
                oldSeasonIsEmpty={oldSeasonIsEmpty}
                isNextDisabled={!hasValidName}
                isCreateDisabled={!(hasValidName && hasValidMoves)}
                animationProgress={swiper.swiperProgress}
                onClear={onCancel}
                onBack={() => {
                    swiper.ref.current?.prev();
                }}
                onNext={() => {
                    swiper.ref.current?.next();
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
            <Swiper
                {...swiper}
                enabled={!(swiper.swiperPage === 0 && !hasValidName)}
                onScrollBegin={() => {
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
                    />
                )}
                <NewSeasonRulesInput
                    moves={newSeasonDraft.newSeasonAllowedMoves}
                    onNewPress={() => {
                        newSeasonDraft.actions.setNewSeasonAllowedMoves([
                            ...newSeasonDraft.newSeasonAllowedMoves,
                            {
                                name: 'New Move',
                                finishingMove: false,
                                pointsForScorer: 1,
                                pointsForTeam: 0,
                            },
                        ]);
                        nav.navigate('allowedMove', {
                            id: newSeasonDraft.newSeasonAllowedMoves.length.toString(),
                        });
                    }}
                    onDelete={(id) =>
                        newSeasonDraft.actions.setNewSeasonAllowedMoves(
                            newSeasonDraft.newSeasonAllowedMoves.filter(
                                (i) => i.id !== id
                            )
                        )
                    }
                />
            </Swiper>
        </>
    );
};
