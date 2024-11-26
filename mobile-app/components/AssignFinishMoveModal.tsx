import React, { useRef, useState } from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import Swiper from 'react-native-swiper';

import { Match } from '@/api/utils/matchDtoToMatch';

import MatchPlayers from './MatchPlayers';
import MenuItem from './Menu/MenuItem';
import MenuSection from './Menu/MenuSection';
import ModalDragHandle from './ModalDragHandle';
import Text from './Text';

export interface AssignFinishModeModalProps {
    isVisible?: boolean;
    onClose?: () => void;

    onSubmit: (playerId: string, moveId: string) => void;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;
}
export default function AssignFinishModeModal({
    match,
    isVisible = false,
    onClose,
    onSubmit,
}: AssignFinishModeModalProps) {
    const players = match.blueTeam.concat(match.redTeam);

    const swiperRef = useRef<Swiper>(null);

    const [playerId, setPlayerId] = useState<string | null>(null);

    const player = players.find((i) => i.id === playerId);

    const [page, setPage] = useState(0);

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            style={{ margin: 0 }}
        >
            <View
                style={{
                    backgroundColor: '#3B3B3B',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: 'hidden',

                    flex: 1,
                    marginTop: 16 * 7,
                }}
            >
                <ModalDragHandle />
                <Swiper
                    scrollEnabled={playerId != null}
                    ref={swiperRef}
                    showsPagination={false}
                    loop={false}
                    style={{ height: 0, padding: 0 }}
                    index={page}
                    onIndexChanged={setPage}
                    contentContainerStyle={{
                        paddingBottom: 32,
                    }}
                >
                    <View style={{ flex: 1, width: '100%' }}>
                        <View
                            style={{
                                alignItems: 'center',

                                flex: 1,
                            }}
                        >
                            <Text color="primary" variant="h3">
                                Who scored the final cup?
                            </Text>
                            <ScrollView
                                style={{
                                    width: '100%',
                                }}
                                contentContainerStyle={{
                                    paddingHorizontal: 16,
                                    paddingTop: 32,
                                    paddingBottom: 32,
                                }}
                            >
                                <MatchPlayers
                                    players={players}
                                    setMoveCount={() => {}}
                                    onPlayerPress={(player) => {
                                        setPlayerId(player.id);
                                        swiperRef.current?.scrollBy(1);
                                    }}
                                />
                            </ScrollView>
                        </View>
                    </View>
                    <View style={{ flex: 1, width: '100%' }}>
                        <View
                            style={{
                                alignItems: 'center',

                                flex: 1,
                            }}
                        >
                            <Text color="primary" variant="h3">
                                {player
                                    ? `How did ${player.name} score the final cup?`
                                    : 'Error'}
                            </Text>
                            <ScrollView
                                style={{
                                    width: '100%',
                                }}
                                contentContainerStyle={{
                                    paddingHorizontal: 16,
                                    paddingTop: 96,
                                    paddingBottom: 32,
                                }}
                            >
                                <MenuSection>
                                    {player?.moves
                                        .filter((i) => i.isFinish)
                                        .map((i) => (
                                            <MenuItem
                                                key={i.id}
                                                title={i.title}
                                                onPress={() => {
                                                    onSubmit(playerId!, i.id);
                                                    onClose?.();
                                                }}
                                            />
                                        ))}
                                </MenuSection>
                            </ScrollView>
                        </View>
                    </View>
                </Swiper>
            </View>
        </Modal>
    );
}
