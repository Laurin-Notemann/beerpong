import { VideoExportPreset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
    useAddScoreClipMutation,
    useDeletePlayerAvatarMutation,
    useDeletePlayerMutation,
} from '@/api/calls/playerHooks';
import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import PlayerScreen from '@/components/screens/Player';
import { triggerHapticBump } from '@/haptics';
import { useNavigation } from '@/lib/navigation/useNavigation';
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

    return (
        <>
            <PlayerScreen
                scopes={scopes}
                name={playerName}
                isPending={
                    isUploadingAvatar ||
                    deletePlayerMutation.isPending ||
                    addScoreClipMutation.isPending
                }
                id={id}
                profileId={profileId}
                hasPremium={false}
                pastSeasons={activeSeasons.length}
                onDelete={canDelete ? onDelete : undefined}
                avatarUrl={player?.profile?.avatarUrl}
                onUploadAvatarPress={onUploadAvatarPress}
                onDeleteAvatarPress={onDeleteAvatarPress}
                scoreClips={scoreClipsOf(player?.profile)}
                isUploadingScoreClip={addScoreClipMutation.isPending}
                onUploadScoreClipPress={onUploadScoreClipPress}
                refresh={refresh}
            />
        </>
    );
}
