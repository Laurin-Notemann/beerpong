import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { useInsets } from '@/app/useInsets';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import MatchPlayers from '@/components/MatchPlayers';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

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

    const insets = useInsets(true, true);

    const matchDraft = useMatchDraftStore();

    return (
        <View style={{ position: 'relative', flex: 1 }}>
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: insets.top + 32,
                    paddingBottom: insets.bottom + 84,
                }}
            >
                {experiments.matchPhotos && (
                    <DualTeamPhoto
                        match={{ blueTeam: [], redTeam: [] }}
                        editable
                        onPhotoTaken={matchDraft.actions.setTeamPhotos}
                        onRemovePress={matchDraft.actions.removeTeamPhotos}
                        onSwapTeamColorsPress={
                            matchDraft.actions.swapTeamPhotos
                        }
                        blueImageSource={
                            matchDraft.blueTeamPhotoUri
                                ? { uri: matchDraft.blueTeamPhotoUri }
                                : undefined
                        }
                        redImageSource={
                            matchDraft.redTeamPhotoUri
                                ? { uri: matchDraft.redTeamPhotoUri }
                                : undefined
                        }
                    />
                )}
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
                    marginBottom: insets.bottom + 16,

                    justifyContent: 'space-between',

                    gap: 16,
                }}
            >
                <OverlayTextButton
                    fullWidth
                    title="Create"
                    isPending={isPending}
                    onPress={onSubmit}
                />
            </SafeAreaView>
        </View>
    );
}
