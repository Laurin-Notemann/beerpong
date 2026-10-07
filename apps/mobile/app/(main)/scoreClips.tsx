import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    NativeSyntheticEvent,
    Platform,
    View,
} from 'react-native';
import PagerView from 'react-native-pager-view';

import { useRemoveScoreClipMutation } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { assetIdOf } from '@/api/utils/assetId';
import LoadingScreen from '@/components/LoadingScreen';
import { triggerHapticBump } from '@/haptics';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { saveScoreClip } from '@/lib/saveScoreClip';
import { scoreClipsOf } from '@/lib/scoreClips';
import { useAndroidIcon } from '@/lib/useAndroidIcon';
import { usePlayerPageScope } from '@/lib/usePlayerPageScope';
import { useScoreClipThumbnail } from '@/lib/useScoreClipThumbnail';
import { useTheme } from '@/theme';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('score-clips');

/**
 * A player's score clips, full screen, from the tiles on their edit page: the one on screen plays
 * with sound and loops, a swipe goes to the next. The toolbar saves or removes it.
 */
export default function Page() {
    const { id, index } = useLocalSearchParams<{ id: string; index: string }>();

    const nav = useNavigation();
    const theme = useTheme();
    const { groupId } = useGroup();
    const { player, isLoading } = usePlayerPageScope(id ?? '');
    const removeMutation = useRemoveScoreClipMutation();
    const [isSaving, setIsSaving] = useState(false);

    // gone right away; the profile only updates with the socket event
    const [removed, setRemoved] = useState<string[]>([]);
    const clips = scoreClipsOf(player?.profile).filter(
        (i) => !removed.includes(i)
    );
    const [page, setPage] = useState(Number(index) || 0);
    const current = Math.max(Math.min(page, clips.length - 1), 0);
    const url = clips[current];

    const name = player?.profile?.name || 'Unknown';
    const profileId = player?.profileId;

    const androidSave = useAndroidIcon('download', theme.color.text.primary);
    const androidRemove = useAndroidIcon(
        'delete-outline',
        theme.color.text.primary
    );
    // iOS saves through the share sheet
    const saveIcon =
        Platform.OS === 'ios' ? 'square.and.arrow.up' : androidSave;
    const removeIcon = Platform.OS === 'ios' ? 'trash' : androidRemove;

    async function save() {
        if (!url) return;
        setIsSaving(true);
        try {
            const folder = await saveScoreClip(url, name);
            if (folder) showSuccessToast(`Score clip saved to ${folder}.`);
        } catch (err) {
            logger.error('failed to save score clip', err);
            showErrorToast("Couldn't save the score clip.", err);
        } finally {
            setIsSaving(false);
        }
    }

    async function remove(clip: string) {
        if (!groupId || !profileId) return;
        try {
            await removeMutation.mutateAsync({
                groupId,
                profileId,
                assetId: assetIdOf(clip),
            });
            triggerHapticBump('light');
            showSuccessToast('Score clip removed.');
            if (clips.length === 1) nav.goBack();
            else setRemoved((prev) => [...prev, clip]);
        } catch (err) {
            logger.error('failed to remove score clip', err);
            showErrorToast('Failed to remove score clip.', err);
        }
    }

    function confirmRemove() {
        if (!url) return;
        Alert.alert(
            'Remove Score Clip?',
            "It won't play when they score anymore.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => remove(url),
                },
            ]
        );
    }

    if (isLoading) return <LoadingScreen />;

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <Stack.Screen
                options={{
                    headerTitle: clips.length
                        ? `${name} · ${current + 1} of ${clips.length}`
                        : name,
                }}
            />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Done
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            {url && (
                <Stack.Toolbar placement="right">
                    {saveIcon && (
                        <Stack.Toolbar.Button
                            icon={saveIcon}
                            accessibilityLabel="Save score clip"
                            disabled={isSaving}
                            onPress={save}
                        />
                    )}
                    {removeIcon && (
                        <Stack.Toolbar.Button
                            icon={removeIcon}
                            accessibilityLabel="Remove score clip"
                            disabled={removeMutation.isPending}
                            onPress={confirmRemove}
                        />
                    )}
                </Stack.Toolbar>
            )}
            <PagerView
                // a removed clip shifts the pages: start over on the clip now at `current`
                key={clips.length}
                style={{ flex: 1 }}
                initialPage={current}
                onPageSelected={(
                    e: NativeSyntheticEvent<{
                        position: number;
                    }>
                ) => setPage(e.nativeEvent.position)}
            >
                {clips.map((clip, i) => (
                    <View key={clip} style={{ flex: 1 }}>
                        {i === current ? (
                            <ClipPlayer url={clip} />
                        ) : (
                            <ClipFrame url={clip} />
                        )}
                    </View>
                ))}
            </PagerView>
        </View>
    );
}

/** the clip on screen; only it has a player */
function ClipPlayer({ url }: { url: string }) {
    const player = useVideoPlayer(url, (p) => {
        p.loop = true;
        p.play();
    });

    return (
        <VideoView
            player={player}
            nativeControls
            contentFit="contain"
            style={{ flex: 1 }}
        />
    );
}

/** the clips next to it, while swiping */
function ClipFrame({ url }: { url: string }) {
    const thumbnail = useScoreClipThumbnail(url);

    if (thumbnail === undefined)
        return <ActivityIndicator style={{ flex: 1 }} />;
    return (
        thumbnail && (
            <Image
                source={thumbnail}
                contentFit="contain"
                style={{ flex: 1 }}
            />
        )
    );
}
