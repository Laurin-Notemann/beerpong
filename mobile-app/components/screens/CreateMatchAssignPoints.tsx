import React from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import Button from '@/components/Button';
import MatchPlayers from '@/components/MatchPlayers';
import { theme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export interface CreateMatchAssignPointsProps {
    isPending: boolean;
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    onSubmit: () => void;
    onCancel: () => void;

    onPlayerPress: (player: TeamMember) => void;
}
export default function CreateMatchAssignPoints({
    isPending,
    players,
    setMoveCount,
    onSubmit,
    onCancel,
    onPlayerPress,
}: CreateMatchAssignPointsProps) {
    const experiments = useLocalSettings();

    return (
        <View style={{ position: 'relative', flex: 1 }}>
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 32,
                    paddingBottom: 84,
                }}
            >
                <MatchPlayers
                    editable
                    players={players}
                    setMoveCount={setMoveCount}
                    onPlayerPress={onPlayerPress}
                />
            </ScrollView>
            <SafeAreaView
                style={{
                    position: 'absolute',
                    flexDirection: 'row',
                    bottom: 0,
                    left: 0,
                    right: 0,

                    marginHorizontal: 8,
                    marginBottom: 16,

                    gap: 16,
                }}
            >
                {experiments.matchPhotos && (
                    <Button
                        variant="secondary"
                        title={
                            <Icon
                                color={theme.color.text.primary}
                                size={24}
                                name="camera"
                            />
                        }
                        size="large"
                        onPress={onSubmit}
                        disabled={isPending}
                        style={{
                            // box shadow:
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 4,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,

                            aspectRatio: 1,
                        }}
                    />
                )}
                <Button
                    variant="primary"
                    title={isPending ? <ActivityIndicator /> : 'Create'}
                    size="large"
                    onPress={onSubmit}
                    disabled={isPending}
                    style={{
                        // box shadow:
                        shadowColor: '#000',
                        shadowOffset: {
                            width: 0,
                            height: 4,
                        },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 5,

                        flex: 1,
                    }}
                />
            </SafeAreaView>
        </View>
    );
}
