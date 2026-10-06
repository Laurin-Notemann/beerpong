import { VideoExportPreset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
    useAddScoreClipMutation,
    useDeletePlayerAvatarMutation,
    useDeletePlayerMutation,
    useRemoveScoreClipMutation,
} from '@/api/calls/playerHooks';
import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { assetIdOf } from '@/api/utils/assetId';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import PlayerScreen from '@/components/screens/Player';
import { triggerHapticBump } from '@/haptics';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { saveScoreClip } from '@/lib/saveScoreClip';
import { scoreClipsOf } from '@/lib/scoreClips';
import { putTemp } from '@/lib/tempRouteStore';
import { usePlayerPageScope } from '@/lib/usePlayerPageScope';
import { showErrorToast, showSuccessToast } from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';

/** how long the score clip Versus TV plays may be */
const SCORE_CLIP_SECONDS = 10;

export default function Page() {
    const router = useRouter();
    const nav = useNavigation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const { groupId, seasonId } = useGroup();

    const deletePlayerMutation = useDeletePlayerMutation();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons = getPastSeasons(seasonsQuery.data?.data);

    // TODO: this should only be the seasons where this specific player was active
    const activeSeasons = pastSeasons;

    const { player, scopes, isLoading } = usePlayerPageScope(id ?? '');

    // A deleted player, or one of a past season, can't be deleted (the API answers 403).
    const canDelete =
        !!player?.activeThisSeason && player.seasonId === seasonId;

    const deleteAvatarMutation = useDeletePlayerAvatarMutation();

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const addScoreClipMutation = useAddScoreClipMutation();
    const removeScoreClipMutation = useRemoveScoreClipMutation();
    const [isSavingScoreClip, setIsSavingScoreClip] = useState(false);

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );
    const profileId = player?.profileId ?? '';

    if (!id) return <ErrorScreen message="Failed to find user" />;

    const playerName = player?.profile?.name || 'Unknown';

    async function onDelete() {
        if (!groupId || !seasonId) return;

        try {
            await deletePlayerMutation.mutateAsync({
                groupId,
                seasonId,
                id,
            });
            showSuccessToast(`Deleted player "${playerName}".`);
            router.back();
        } catch (err) {
            ConsoleLogger.error('failed to delete player:', err);
            showErrorToast('Failed to delete player.', err);
        }
    }

    if (isLoading) return <LoadingScreen />;

    async function onUploadAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        setIsUploadingAvatar(true);

        const [result] = await launchImageLibrary({
            // mediaTypes: ['images'],
            selectionLimit: 1,
        });

        setIsUploadingAvatar(false);

        // cancelled
        if (!result) return;

        triggerHapticBump('light');

        // the crop screen reads the picked file itself
        const imageKey = putTemp<string>(result.uri);
        nav.navigate('cropAvatar', { imageKey, profileId });
    }

    async function onDeleteAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        setIsUploadingAvatar(true);

        try {
            await deleteAvatarMutation.mutateAsync({
                groupId,
                profileId,
            });
            showSuccessToast('Player avatar deleted.');
        } catch (err) {
            ConsoleLogger.error('failed to delete player avatar:', err);
            showErrorToast('Failed to delete player avatar.', err);
        } finally {
            setIsUploadingAvatar(false);
        }
    }

    async function onUploadScoreClipPress() {
        if (!groupId || !profileId) return;

        const [result] = await launchImageLibrary({
            mediaTypes: ['videos'],
            // iOS trims to `videoMaxDuration` and exports H.264, which the TV's old Chromium
            // plays (it can't play the HEVC iPhones record); Android hands over the file as is
            allowsEditing: true,
            videoMaxDuration: SCORE_CLIP_SECONDS,
            videoExportPreset: VideoExportPreset.H264_1280x720,
        });

        // cancelled
        if (!result) return;

        // Android can't trim in the picker; the TV would cut a longer clip off anyway
        if ((result.duration ?? 0) > (SCORE_CLIP_SECONDS + 0.5) * 1000) {
            showErrorToast(
                `Trim the clip to ${SCORE_CLIP_SECONDS} seconds first.`
            );
            return;
        }

        triggerHapticBump('light');

        try {
            await addScoreClipMutation.mutateAsync({
                uri: result.uri,
                groupId,
                profileId,
            });
            showSuccessToast('Score clip uploaded.');
        } catch (err) {
            ConsoleLogger.error('failed to upload score clip:', err);
            // a failed upload takes the new clip off again (useAddScoreClipMutation)
            showErrorToast(
                "The score clip didn't upload. Try again on a good connection, and keep Versus open until it's done.",
                err
            );
        }
    }

    async function removeScoreClip(url: string) {
        if (!groupId || !profileId) return;

        try {
            await removeScoreClipMutation.mutateAsync({
                groupId,
                profileId,
                assetId: assetIdOf(url),
            });
            showSuccessToast('Score clip removed.');
        } catch (err) {
            ConsoleLogger.error('failed to remove score clip:', err);
            showErrorToast('Failed to remove score clip.', err);
        }
    }

    async function saveClip(url: string) {
        setIsSavingScoreClip(true);
        try {
            await saveScoreClip(url, playerName);
        } catch (err) {
            ConsoleLogger.error('failed to save score clip:', err);
            showErrorToast("Couldn't save the score clip.", err);
        } finally {
            setIsSavingScoreClip(false);
        }
    }

    function onScoreClipPress(url: string, index: number) {
        Alert.alert(`Score Clip ${index + 1}`, undefined, [
            { text: 'Save', onPress: () => saveClip(url) },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: () =>
                    Alert.alert(
                        'Remove Score Clip?',
                        "It won't play when they score anymore.",
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => removeScoreClip(url),
                            },
                        ]
                    ),
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }

    return (
        <>
            <PlayerScreen
                scopes={scopes}
                name={playerName}
                isPending={
                    isUploadingAvatar ||
                    deletePlayerMutation.isPending ||
                    addScoreClipMutation.isPending ||
                    removeScoreClipMutation.isPending ||
                    isSavingScoreClip
                }
                id={id}
                profileId={profileId!}
                hasPremium={false}
                pastSeasons={activeSeasons.length}
                onDelete={canDelete ? onDelete : undefined}
                avatarUrl={player?.profile?.avatarUrl}
                onUploadAvatarPress={onUploadAvatarPress}
                onDeleteAvatarPress={onDeleteAvatarPress}
                scoreClips={scoreClipsOf(player?.profile)}
                isUploadingScoreClip={addScoreClipMutation.isPending}
                onUploadScoreClipPress={onUploadScoreClipPress}
                onScoreClipPress={onScoreClipPress}
                refresh={refresh}
            />
        </>
    );
}
