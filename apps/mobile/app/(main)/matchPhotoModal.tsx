import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { attachTeamPhotos } from '@/api/calls/matchHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { DualCameraPhoto } from '@/components/DualCameraView';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import Text from '@/components/Text';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { RematchParams, useOfferRematch } from '@/lib/useOfferRematch';
import { useTheme } from '@/theme';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('match-photo');

/**
 * Asks for the team photo of a match that was just entered without one. Skipping closes it; the
 * photo can still be added from the match later. Leaving this step offers a rematch when the
 * creator passed the teams along.
 */
export default function Page() {
    const {
        matchId,
        seasonId,
        groupId: matchGroupId,
        rematch,
        redPlayerIds,
        bluePlayerIds,
    } = useLocalSearchParams<
        { matchId: string; seasonId: string } & Partial<RematchParams>
    >();

    const theme = useTheme();
    const nav = useNavigation();
    const offerRematch = useOfferRematch();
    const qc = useQueryClient();
    const { api } = useApi();
    const { groupId } = useGroup();

    const [didOfferRematch, setDidOfferRematch] = useState(false);
    // Save and Skip both leave this screen. The native back action skips the photo too.
    // Keep the photo screen present behind the alert, then continue the dismissal.
    usePreventRemove(!!rematch && !didOfferRematch, ({ repeat }) => {
        setDidOfferRematch(true);
        if (!matchGroupId || !rematch || !redPlayerIds || !bluePlayerIds) {
            repeat();
            return;
        }
        if (
            !offerRematch(
                {
                    groupId: matchGroupId,
                    seasonId,
                    rematch,
                    redPlayerIds,
                    bluePlayerIds,
                },
                repeat
            )
        ) {
            repeat();
        }
    });

    const [photos, setPhotos] = useState<DualCameraPhoto | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    async function save() {
        if (!photos || !groupId || isSaving) return;

        setIsSaving(true);
        try {
            await attachTeamPhotos(api, { groupId, seasonId, matchId }, photos);
            void qc.invalidateQueries({
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
                    disabled={!photos}
                    onPress={save}
                />
            </View>
        </ScrollView>
    );
}
