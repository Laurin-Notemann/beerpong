import {
    useCreatePlayerMutation,
    usePlayersQuery,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import CreateNewPlayer from '@/components/screens/CreateNewPlayer';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const players = playersQuery.data?.data ?? [];

    const existingPlayers = players.map((i) => i.profile!.name!);

    const { mutateAsync } = useCreatePlayerMutation();

    async function onSubmit(player: { name: string }) {
        if (!groupId || !seasonId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                name: player.name,
            });
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to create player:', err);
            showErrorToast('Failed to create player.');
        }
    }

    return (
        <CreateNewPlayer
            onCreate={onSubmit}
            existingPlayers={existingPlayers}
        />
    );
}
