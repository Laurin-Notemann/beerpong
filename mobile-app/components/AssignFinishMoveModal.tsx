import React, { useRef, useState } from 'react';
import { SafeAreaView, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import Swiper from 'react-native-swiper';

import { Match } from '@/api/utils/matchDtoToMatch';

import MatchPlayers from './MatchPlayers';
import Text from './Text';

export interface AssignFinishModeModalProps {
    isVisible?: boolean;
    onClose?: () => void;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;
}
export default function AssignFinishModeModal({
    match,
    isVisible = false,
    onClose,
}: AssignFinishModeModalProps) {
    const players = match.blueTeam.concat(match.redTeam);

    const swiperRef = useRef<Swiper>(null);

    const [playerId, setPlayerId] = useState<string | null>(null);

    const player = players.find((i) => i.id === playerId);

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
                <Swiper
                    scrollEnabled={playerId != null}
                    ref={swiperRef}
                    showsPagination={false}
                    loop={false}
                    style={{ height: 0 }}
                    index={0}
                >
                    <View style={{ flex: 1 }}>
                        <View
                            style={{
                                width: '100%',
                                alignItems: 'center',
                                paddingTop: 32,
                                paddingBottom: 32,
                            }}
                        >
                            <Text
                                color="primary"
                                variant="h3"
                                style={{ marginTop: 8 }}
                            >
                                Who scored the final cup?
                            </Text>
                            {/* <ScrollView
                                style={{
                                    flex: 1,

                                    backgroundColor: 'orange',
                                }}
                                contentContainerStyle={{
                                    paddingHorizontal: 16,
                                    paddingTop: 32,
                                    paddingBottom: 32,
                                }}
                            > */}
                            <MatchPlayers
                                players={players}
                                setMoveCount={() => {}}
                                onPlayerPress={(player) => {
                                    setPlayerId(player.id);
                                    swiperRef.current?.scrollBy(1);
                                }}
                            />
                            {/* </ScrollView> */}
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View
                            style={{
                                width: '100%',
                                alignItems: 'center',
                                paddingTop: 32,
                                paddingBottom: 32,
                            }}
                        >
                            <Text
                                color="primary"
                                variant="h3"
                                style={{ marginTop: 8 }}
                            >
                                {player
                                    ? `How did ${player.name} score the final cup?`
                                    : 'Error'}
                            </Text>
                            {player?.moves.map((i) => (
                                <TouchableOpacity key={i.id} onPress={() => {}}>
                                    <Text color="primary" variant="h3">
                                        {i.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Swiper>
            </SafeAreaView>
        </Modal>
    );
}
