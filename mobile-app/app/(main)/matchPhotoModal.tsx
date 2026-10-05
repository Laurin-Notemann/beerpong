import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { uploadTeamPhoto, useMatchesQuery } from '@/api/calls/matchHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { DualCameraPhoto } from '@/components/DualCameraView';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import Text from '@/components/Text';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useTheme } from '@/theme';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('match-photo');

/**
 * Asks for the team photo of a match that was just entered without one. Skipping closes it; the
 * photo can still be added from the match later.
 */
export default function Page() {
    const { matchId, seasonId } = useLocalSearchParams<{
        matchId: string;
        seasonId: string;
    }>();

    const theme = useTheme();
    const nav = useNavigation();
    const qc = useQueryClient();
    const { api } = useApi();
    const { groupId } = useGroup();

    const match = useMatchesQuery(groupId, seasonId).data?.data?.find(
        (i) => i.id === matchId
    );
    // the teams in the order the match was created in: blue, then red
    const [blueTeamId, redTeamId] = (match?.teams ?? []).map((i) => i.id);

    const [photos, setPhotos] = useState<DualCameraPhoto | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    async function save() {
        if (!photos || !groupId || !blueTeamId || !redTeamId) return;

        setIsSaving(true);
        try {
            for (const [teamId, uri] of [
                [blueTeamId, photos.blueTeamPhotoUri],
                [redTeamId, photos.redTeamPhotoUri],
            ] as const) {
                const res = await (
                    await api
                ).setPhoto({ groupId, seasonId, id: matchId, teamId });
                await uploadTeamPhoto({ teamPhoto: res.data.data }, uri);
            }
            qc.invalidateQueries({
                queryKey: [QK.group, groupId, QK.season, seasonId, QK.matches],
            });
            showSuccessToast('Team photo saved.');
            nav.goBack();
        } catch (err) {
            logger.error('failed to save the team photo', err);
            showErrorToast("Couldn't save the team photo.", err);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.panel.dark.bg }}
            contentContainerStyle={{ padding: 16, gap: 16 }}
        >
            <Stack.Screen options={{ headerTitle: 'Team Photo' }} />
            <Text color="secondary">
                Take a photo of both teams to remember this match.
            </Text>
            <DualTeamPhoto
                match={{ blueTeam: [], redTeam: [] }}
                editable
                onPhotoTaken={setPhotos}
                onRemovePress={() => setPhotos(null)}
                onSwapTeamColorsPress={() =>
                    setPhotos(
                        (prev) =>
                            prev && {
                                blueTeamPhotoUri: prev.redTeamPhotoUri,
                                redTeamPhotoUri: prev.blueTeamPhotoUri,
                            }
                    )
                }
                blueImageSource={
                    photos ? { uri: photos.blueTeamPhotoUri } : undefined
                }
                redImageSource={
                    photos ? { uri: photos.redTeamPhotoUri } : undefined
                }
            />
            <View style={{ flexDirection: 'row', gap: 16 }}>
                <OverlayTextButton
                    fullWidth
                    title="Skip"
                    disabled={isSaving}
                    onPress={nav.goBack}
                />
                <OverlayTextButton
                    fullWidth
                    title="Save"
                    isPending={isSaving}
                    disabled={!photos || !blueTeamId || !redTeamId}
                    onPress={save}
                />
            </View>
        </ScrollView>
    );
}
