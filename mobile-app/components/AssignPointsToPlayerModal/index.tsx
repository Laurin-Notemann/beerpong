import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Host as PortalProvider } from 'react-native-portalize';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match, PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';
import FinishMovePage from '@/components/AssignPointsToPlayerModal/FinishMovePage';
import FinishScorerPage from '@/components/AssignPointsToPlayerModal/FinishScorerPage';
import PlayerPage from '@/components/AssignPointsToPlayerModal/PlayerPage';
import { HeaderItem } from '@/components/HeaderItem';
import MatchVsHeader from '@/components/MatchVsHeader';
import { Swiper, useSwiperWithPageState } from '@/components/Swiper';
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useTutorials } from '@/zustand/tutorialStore';

const showVsHeader = false;

export interface AssignPointsToPlayerModalProps {
    onClose?: () => void;

    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    initialPageIdx: number | null;
}
export default function AssignPointsToPlayerModal({
    match,
    onClose,
    setMoveCount,
    initialPageIdx,
}: AssignPointsToPlayerModalProps) {
    const experiments = useLocalSettings();

    const { hasDraggedToAssignPoints } = useTutorials();

    const players = match.blueTeam.concat(match.redTeam);

    const swiper = useSwiperWithPageState({ initialPage: initialPageIdx });

    // used for a scuffed hack to prevent the modal from reopening when clicking outside of it
    const playerIdxRef = useRef(swiper.swiperPage);

    useEffect(() => {
        playerIdxRef.current = swiper.swiperPage;
    }, [swiper.swiperPage]);

    const [finisherId, setFinisherId] = useState<string | null>(null);

    const finisher = players.find((i) =>
        i.moves?.find((j) => (j.isFinish && j.count > 0) || i.id === finisherId)
    );

    const finishMove = finisher?.moves.find((i) => i.isFinish && i.count > 0);

    const isAssignFinisherPage = swiper.swiperPage === players.length;
    const isAssignFinishMovePage = swiper.swiperPage === players.length + 1;

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
        setTimeout(
            () => swiper.ref.current?.scrollTo({ index: 1, animated: true }),
            0
        );
    }
    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerLeft:
                        swiper.swiperPage === 0
                            ? undefined
                            : () => (
                                  <HeaderItem
                                      noMargin
                                      onPress={() => swiper.ref.current?.prev()}
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
                                            swiper.ref.current?.next()
                                        }
                                    >
                                        <Icon name="chevron-right" size={32} />
                                    </HeaderItem>
                                ),
                }}
            />
            <PortalProvider>
                <View
                    style={{
                        backgroundColor: theme.panel.dark.bg,

                        flex: 1,
                    }}
                >
                    {showVsHeader && (
                        <MatchVsHeader
                            match={match}
                            highlightedId={players[swiper.swiperPage!]?.id}
                        />
                    )}

                    <Swiper {...swiper}>
                        {[...players, null, null].map((i, idx) => {
                            if (idx < players.length)
                                return (
                                    <PlayerPage
                                        key={idx}
                                        player={i!}
                                        finishMove={
                                            finisher?.id === i!.id
                                                ? finishMove
                                                : undefined
                                        }
                                        setMoveCount={setMoveCount}
                                        hasSwipeTutorial={
                                            experiments.tutorials &&
                                            !hasDraggedToAssignPoints &&
                                            idx === 0
                                        }
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
            </PortalProvider>
        </>
    );
}
