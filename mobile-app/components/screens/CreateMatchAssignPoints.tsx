import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { useInsets } from '@/app/useInsets';
import { DualCameraView } from '@/components/DualCameraView';
import MatchPlayers from '@/components/MatchPlayers';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
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

    const insets = useInsets(true, true);

    const [takeTeamPhoto, setTakeTeamPhoto] = React.useState(false);

    if (takeTeamPhoto) return <DualCameraView />;

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
                {experiments.matchPhotos && (
                    <OverlayIconButton
                        iconName="camera"
                        onPress={() => setTakeTeamPhoto(true)}
                    />
                )}
                {/* <OverlayTextButton
                    fullWidth
                    title="Pro mode"
                    isPending={isPending}
                    onPress={onSubmit}
                /> */}
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
