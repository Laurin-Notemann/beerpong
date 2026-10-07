import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import { startLiveMatch } from '@/api/liveMatch/useLiveMatch';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

/** Serializable navigation params; player ids are UUIDs, joined by commas. */
export interface RematchParams {
    groupId: string;
    seasonId: string;
    redPlayerIds: string;
    bluePlayerIds: string;
    rematch: 'live' | 'draft';
}

/** Offered after saving or skipping the photo, or saving a match that already has one. */
export function useOfferRematch() {
    const router = useRouter();
    const { groupId, seasonId } = useGroup();

    return (params: RematchParams, onComplete?: () => void) => {
        // Player ids belong to a season; never carry them into another one.
        if (params.groupId !== groupId || params.seasonId !== seasonId)
            return false;
        const redPlayerIds = params.redPlayerIds.split(',').filter(Boolean);
        const bluePlayerIds = params.bluePlayerIds.split(',').filter(Boolean);
        if (!redPlayerIds.length || !bluePlayerIds.length) return false;

        let completed = false;
        const complete = () => {
            if (completed) return;
            completed = true;
            onComplete?.();
        };
        Alert.alert(
            'Rematch?',
            'Play again with the same teams?',
            [
                { text: 'Not now', style: 'cancel', onPress: complete },
                {
                    text: 'Rematch',
                    onPress: () => {
                        complete();
                        router.dismissAll();
                        if (params.rematch === 'live') {
                            const id = startLiveMatch({
                                groupId: params.groupId,
                                seasonId: params.seasonId,
                                redPlayerIds,
                                bluePlayerIds,
                            });
                            router.navigate({
                                pathname: '/liveMatch',
                                params: { id },
                            });
                        } else {
                            const { actions } = useMatchDraftStore.getState();
                            actions.clear();
                            actions.setTeams(
                                redPlayerIds.map((id) => ({ id })),
                                bluePlayerIds.map((id) => ({ id }))
                            );
                            router.navigate('/newMatch');
                        }
                    },
                },
            ],
            { cancelable: true, onDismiss: complete }
        );
        return true;
    };
}
