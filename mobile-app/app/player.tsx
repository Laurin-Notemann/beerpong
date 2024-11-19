import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';

import {
    useDeletePlayerMutation,
    usePlayersQuery,
    useUpdatePlayerAvatarMutation,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { mockMatches } from '@/components/mockData/matches';
import PlayerScreen from '@/components/screens/Player';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

import { useNavigation } from './navigation/useNavigation';

const base64ToByteArray = (base64: string): Uint8Array<ArrayBuffer> => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
};

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { mutateAsync } = useDeletePlayerMutation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const { mutateAsync: uploadAvatarAsync } = useUpdatePlayerAvatarMutation();

    if (!id) return <ErrorScreen message="Failed to find user" />;

    async function onDelete() {
        if (!groupId || !seasonId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                id,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to delete player:', err);
            showErrorToast('Failed to delete player.');
        }
    }

    const player = (playersQuery.data?.data ?? []).find((i) => i.id === id);

    const profileId = player?.profile?.id;

    if (playersQuery.isLoading) return <LoadingScreen />;

    if (!playersQuery.data?.data)
        return <ErrorScreen error={playersQuery.error} />;

    async function onUploadAvatarPress() {
        if (!groupId || !seasonId || !profileId) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            // mediaTypes: ['images'],
            selectionLimit: 1,
        });
        const avatarUri = result.assets?.[0]?.uri;
        const mimeType = result.assets?.[0].mimeType;

        if (!avatarUri || !mimeType) return;

        const base64Uri = await FileSystem.readAsStringAsync(avatarUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const byteArray = base64ToByteArray(base64Uri);

        try {
            await uploadAvatarAsync({
                groupId,
                seasonId,
                profileId,
                byteArray,
                mimeType,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to upload player avatar:', err);
            showErrorToast('Failed to upload player avatar.');
        }
    }

    return (
        <PlayerScreen
            id={id}
            placement={6}
            name={player?.profile?.name || 'Unknown'}
            elo={216}
            matchesWon={player?.statistics?.matches ?? 0}
            points={player?.statistics?.points ?? 0}
            hasPremium={false}
            pastSeasons={1}
            matches={mockMatches}
            onDelete={onDelete}
            avatarUrl={player?.profile?.avatarAsset?.url}
            onUploadAvatarPress={onUploadAvatarPress}
        />
    );
}
