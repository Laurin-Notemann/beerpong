import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Swiper from 'react-native-swiper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match, PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';

import { HeaderItem } from '../HeaderItem';
import MatchVsHeader from '../MatchVsHeader';
import FinishMovePage from './FinishMovePage';
import FinishScorerPage from './FinishScorerPage';
import PlayerPage from './PlayerPage';

const showVsHeader = false;

export interface AssignPointsToPlayerModalProps {
    isVisible?: boolean;
    onClose?: () => void;

    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    pageIdx: number | null;
    setPageIdx: (idx: number) => void;
}
export default function AssignPointsToPlayerModal({
    match,
    isVisible = false,
    onClose,
    setMoveCount,
    pageIdx,
    setPageIdx,
}: AssignPointsToPlayerModalProps) {
    const players = match.blueTeam.concat(match.redTeam);

    const swiperRef = useRef<Swiper>(null);

    // used for a scuffed hack to prevent the modal from reopening when clicking outside of it
    const playerIdxRef = useRef(pageIdx);

    useEffect(() => {
        playerIdxRef.current = pageIdx;
    }, [pageIdx]);

    const [finisherId, setFinisherId] = useState<string | null>(null);

    const finisher = players.find((i) =>
        i.moves?.find((j) => (j.isFinish && j.count > 0) || i.id === finisherId)
    );

    const finishMove = finisher?.moves.find((i) => i.isFinish && i.count > 0);

    const isAssignFinisherPage = pageIdx === players.length;
    const isAssignFinishMovePage = pageIdx === players.length + 1;

    async function onSetFinishMove(move: PerformedMove) {
        if (finisher) {
            // remove existing finish move
            if (finishMove) setMoveCount(finisher.id, finishMove.id, 0);
            setMoveCount(finisher.id, move.id, 1);
            onClose?.();
        }
    }

    async function onSetFinisher(player: TeamMember) {
        if (finishMove) {
            setMoveCount(finisher!.id, finishMove.id, 0);
            setMoveCount(player.id, finishMove.id, 1);
        }

        setFinisherId(player.id);
        // timeout of 0 is necessary because the next page isn't even rendered yet
        setTimeout(() => swiperRef.current?.scrollBy(1), 0);
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerLeft:
                        pageIdx === 0
                            ? undefined
                            : () => (
                                  <HeaderItem
                                      noMargin
                                      onPress={() =>
                                          swiperRef.current?.scrollBy(-1)
                                      }
                                  >
                                      <Icon name="chevron-left" size={32} />
                                  </HeaderItem>
                              ),
                    headerRight:
                        isAssignFinishMovePage && finishMove
                            ? () => (
                                  <HeaderItem
                                      noMargin
                                      onPress={onClose}
                                      style={{
                                          marginLeft: 'auto',
                                      }}
                                  >
                                      Done
                                  </HeaderItem>
                              )
                            : (isAssignFinisherPage && !finisher) ||
                                isAssignFinishMovePage
                              ? undefined
                              : () => (
                                    <HeaderItem
                                        noMargin
                                        onPress={() =>
                                            swiperRef.current?.scrollBy(1)
                                        }
                                    >
                                        <Icon name="chevron-right" size={32} />
                                    </HeaderItem>
                                ),
                }}
            />
            <View
                style={{
                    backgroundColor: '#1B1B1B',

                    flex: 1,
                }}
            >
                {showVsHeader && (
                    <MatchVsHeader
                        match={match}
                        highlightedId={players[pageIdx!]?.id}
                    />
                )}

                <Swiper
                    ref={swiperRef}
                    showsPagination={false}
                    loop={false}
                    index={pageIdx!}
                    onIndexChanged={(value) => {
                        setTimeout(() => {
                            // for some reason, onIndexChanged gets fired with 0 when dismissing the modal by clicking outside of it, leading to the modal opening again
                            // at this point, the component hasn't rerendered yet, so playerIdx will still be a non-null value, so we can't check against that.
                            // to work around this, we wait 0ms (which actually translates to a short wait) for the playerIdx to change to null.
                            // we have to use a ref for the playerIdx because we're inside a callback, and the value of playerIdx will be the same as when the callback was created (so non-null).
                            if (playerIdxRef.current != null) setPageIdx(value);
                        }, 0);
                    }}
                    style={{ height: 0 }}
                >
                    {[...players, null, null].map((i, idx) => {
                        if (idx < players.length)
                            return (
                                <PlayerPage
                                    key={idx}
                                    player={i!}
                                    finishMove={
                                        finisherId === i!.id
                                            ? finishMove
                                            : undefined
                                    }
                                    setMoveCount={setMoveCount}
                                />
                            );
                        if (idx === players.length)
                            return (
                                <FinishScorerPage
                                    key={idx}
                                    finisher={finisher}
                                    players={players}
                                    onSetFinisher={onSetFinisher}
                                />
                            );

                        if (finisher)
                            return (
                                <FinishMovePage
                                    key={idx}
                                    finisher={finisher}
                                    onSetFinishMove={onSetFinishMove}
                                />
                            );

                        return null;
                    })}
                </Swiper>
            </View>
        </>
    );
}
