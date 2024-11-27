import React, { useEffect, useRef } from 'react';
import { SafeAreaView, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import Swiper from 'react-native-swiper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match, TeamMember } from '@/api/utils/matchDtoToMatch';
import { theme } from '@/theme';

import Avatar from './Avatar';
import { HeaderItem } from './HeaderItem';
import MatchVsHeader from './MatchVsHeader';
import ModalDragHandle from './ModalDragHandle';
import Text from './Text';

const showVsHeader = false;

export interface AssignPointsToPlayerModalProps {
    isVisible?: boolean;
    onClose?: () => void;

    editable?: boolean;

    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    playerIdx: number | null;
    setPlayerIdx: (idx: number) => void;
}
export default function AssignPointsToPlayerModal({
    match,
    isVisible = false,
    onClose,
    setMoveCount,
    editable = false,
    playerIdx,
    setPlayerIdx,
}: AssignPointsToPlayerModalProps) {
    const players = match.blueTeam.concat(match.redTeam);

    const swiperRef = useRef<Swiper>(null);

    function PlayerPage({ player }: { player: TeamMember }) {
        return (
            <View style={{ flex: 1 }}>
                <View
                    style={{
                        width: '100%',
                        alignItems: 'center',
                        paddingTop: 32,
                        paddingBottom: 32,
                    }}
                >
                    <Avatar
                        name={player.name}
                        url={player.avatarUrl}
                        borderColor={theme.color.team[player.team!]}
                        size={96}
                    />
                    <Text color="primary" variant="h3" style={{ marginTop: 8 }}>
                        {player.name}
                    </Text>
                    <Text color="secondary" style={{ marginTop: 16 }}>
                        How many cups did {player.name} score?
                    </Text>
                </View>
                {player.moves.map((i, idx) => (
                    <View
                        key={idx}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',

                            height: 44,
                            paddingLeft: 64,
                            paddingRight: 16,
                        }}
                    >
                        <Text
                            variant="body1"
                            color="primary"
                            style={{
                                marginRight: 'auto',
                            }}
                        >
                            {i.title}
                        </Text>
                        <TouchableOpacity
                            disabled={i.count < 1}
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',

                                width: 44,
                                height: 44,

                                opacity: i.count < 1 ? 0.2 : 1,
                            }}
                            onPress={() => {
                                if (i.count > 0)
                                    setMoveCount(player.id, i.id, i.count - 1);
                            }}
                        >
                            <Icon
                                color={theme.color.text.secondary}
                                size={24}
                                name="minus"
                            />
                        </TouchableOpacity>

                        <Text variant="body1" color="primary">
                            {i.count}
                        </Text>
                        <TouchableOpacity
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',

                                width: 44,
                                height: 44,
                            }}
                            onPress={() => {
                                setMoveCount(player.id, i.id, i.count + 1);
                            }}
                        >
                            <Icon
                                color={theme.color.text.secondary}
                                size={24}
                                name="plus"
                            />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    }

    // used for a scuffed hack to prevent the modal from reopening when clicking outside of it
    const playerIdxRef = useRef(playerIdx);

    useEffect(() => {
        playerIdxRef.current = playerIdx;
    }, [playerIdx]);

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            style={{ margin: 0 }}
        >
            <SafeAreaView
                style={{
                    backgroundColor: '#3B3B3B',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: 'hidden',

                    flex: 1,
                    marginTop: 16 * 7,
                }}
            >
                <ModalDragHandle
                    onBackPress={
                        playerIdx === 0
                            ? undefined
                            : () => swiperRef.current?.scrollBy(-1)
                    }
                    onNextPress={
                        playerIdx === players.length - 1
                            ? undefined
                            : () => swiperRef.current?.scrollBy(+1)
                    }
                    headerRight={
                        playerIdx === players.length - 1 ? (
                            <HeaderItem
                                onPress={onClose}
                                style={{
                                    marginLeft: 'auto',
                                }}
                            >
                                Done
                            </HeaderItem>
                        ) : undefined
                    }
                />
                {showVsHeader && (
                    <MatchVsHeader
                        match={match}
                        highlightedId={players[playerIdx!]?.id}
                    />
                )}

                <Swiper
                    ref={swiperRef}
                    showsPagination={false}
                    loop={false}
                    index={playerIdx!}
                    onIndexChanged={(value) => {
                        setTimeout(() => {
                            // for some reason, onIndexChanged gets fired with 0 when dismissing the modal by clicking outside of it, leading to the modal opening again
                            // at this point, the component hasn't rerendered yet, so playerIdx will still be a non-null value, so we can't check against that.
                            // to work around this, we wait 0ms (which actually translates to a short wait) for the playerIdx to change to null.
                            // we have to use a ref for the playerIdx because we're inside a callback, and the value of playerIdx will be the same as when the callback was created (so non-null).
                            if (playerIdxRef.current != null)
                                setPlayerIdx(value);
                        }, 0);
                    }}
                    style={{ height: 0 }}
                >
                    {players.map((i) => (
                        <PlayerPage key={i.id} player={i} />
                    ))}
                </Swiper>
            </SafeAreaView>
        </Modal>
    );
}
