import React from 'react';
import { ScrollView, View } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import MatchPlayers from '@/components/MatchPlayers';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import { useInsets } from '@/lib/useInsets';
import { useMatchEntry } from '@/lib/useMatchEntry';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export interface CreateMatchAssignPointsProps {
    isPending: boolean;
    players: TeamMember[];
    /** the live match to enter into; without it, the local draft */
    liveMatchId?: string;

    onSubmit: () => void;
    onCancel: () => void;

    onPlayerPress: (player: TeamMember) => void;
}
export default function CreateMatchAssignPoints({
    isPending,
    players,
    liveMatchId,
    onSubmit,
    onCancel,
    onPlayerPress,
}: CreateMatchAssignPointsProps) {
    const insets = useInsets(true, true);

    const matchDraft = useMatchDraftStore();
    const entry = useMatchEntry(liveMatchId);

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
                <DualTeamPhoto
                    match={{ blueTeam: [], redTeam: [] }}
                    editable
                    onPhotoTaken={matchDraft.actions.setTeamPhotos}
                    onRemovePress={matchDraft.actions.removeTeamPhotos}
                    onSwapTeamColorsPress={matchDraft.actions.swapTeamPhotos}
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
                <MatchPlayers
                    editable
                    players={players}
                    setMoveCount={entry.actions.setMoveCount}
                    onPlayerPress={onPlayerPress}
                />
            </ScrollView>
            <View
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
            </View>
        </View>
    );
}
