import React from 'react';
import { ScrollView, View } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { DualCameraPhoto } from '@/components/DualCameraView';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import MatchPlayers from '@/components/MatchPlayers';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import { useInsets } from '@/lib/useInsets';
import { useMatchEntry } from '@/lib/useMatchEntry';
import { useLiveMatchPhotoStore } from '@/zustand/liveMatchPhotoStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export interface CreateMatchAssignPointsProps {
    players: TeamMember[];
    /**
     * the live match to enter into; without it, the local draft. A live match's team photo stays
     * on this phone until it's finished, and its screen has its own Finish button.
     */
    liveMatchId?: string;

    /** the draft's Create button */
    isPending?: boolean;
    onSubmit?: () => void;
    /** creates the match like `onSubmit`, then starts the next one with the same teams */
    onRematch?: () => void;
    onCancel?: () => void;

    onPlayerPress: (player: TeamMember) => void;
    /** a live match's players' Elo change if it ended now, by season player id */
    eloChanges?: Map<string, number>;
}
export default function CreateMatchAssignPoints({
    isPending,
    players,
    liveMatchId,
    onSubmit,
    onRematch,
    onCancel,
    onPlayerPress,
    eloChanges,
}: CreateMatchAssignPointsProps) {
    const insets = useInsets(true, true);

    const matchDraft = useMatchDraftStore();
    const entry = useMatchEntry(liveMatchId);
    const isLive = !!liveMatchId;

    const livePhotos = useLiveMatchPhotoStore((s) =>
        liveMatchId ? s.photos[liveMatchId] : undefined
    );
    const setLivePhotos = useLiveMatchPhotoStore((s) => s.actions.set);
    const photos = isLive
        ? {
              blue: livePhotos?.blueTeamPhotoUri,
              red: livePhotos?.redTeamPhotoUri,
              set: (p: DualCameraPhoto) => setLivePhotos(liveMatchId, p),
              remove: () => setLivePhotos(liveMatchId, null),
              swap: () =>
                  livePhotos &&
                  setLivePhotos(liveMatchId, {
                      blueTeamPhotoUri: livePhotos.redTeamPhotoUri,
                      redTeamPhotoUri: livePhotos.blueTeamPhotoUri,
                  }),
          }
        : {
              blue: matchDraft.blueTeamPhotoUri,
              red: matchDraft.redTeamPhotoUri,
              set: matchDraft.actions.setTeamPhotos,
              remove: matchDraft.actions.removeTeamPhotos,
              swap: matchDraft.actions.swapTeamPhotos,
          };

    return (
        <View style={{ position: 'relative', flex: 1 }}>
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: insets.top + (isLive ? 16 : 32),
                    paddingBottom: insets.bottom + (isLive ? 16 : 84),
                }}
            >
                <DualTeamPhoto
                    match={{ blueTeam: [], redTeam: [] }}
                    editable
                    onPhotoTaken={photos.set}
                    onRemovePress={photos.remove}
                    onSwapTeamColorsPress={photos.swap}
                    blueImageSource={
                        photos.blue ? { uri: photos.blue } : undefined
                    }
                    redImageSource={
                        photos.red ? { uri: photos.red } : undefined
                    }
                />
                <MatchPlayers
                    editable
                    players={players}
                    setMoveCount={entry.actions.setMoveCount}
                    onPlayerPress={onPlayerPress}
                    eloChanges={eloChanges}
                />
            </ScrollView>
            {!isLive && (
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
                    {onRematch && (
                        <OverlayTextButton
                            title="Rematch"
                            isPending={isPending}
                            onPress={onRematch}
                        />
                    )}
                    <OverlayTextButton
                        fullWidth
                        title="Create"
                        isPending={isPending}
                        onPress={onSubmit}
                    />
                </View>
            )}
        </View>
    );
}
