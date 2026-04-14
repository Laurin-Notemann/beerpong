import {
    useCreatePlayerMutation,
    usePlayersQuery,
    useProfilesQuery,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import CreateNewPlayer from '@/components/screens/CreateNewPlayer';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const players = playersQuery.data?.data ?? [];

    const profilesQuery = useProfilesQuery(groupId);

    const profilesList = profilesQuery.data?.data ?? [];

    const existingPlayers = players.map((i) => {
        const profile = profilesList.find((j) => j.id === i.profileId);
        return profile?.name ?? '';
    });

    const createPlayerMutation = useCreatePlayerMutation();

    async function onSubmit(player: { name: string }) {
        if (!groupId || !seasonId) return;

        try {
            await createPlayerMutation.mutateAsync({
                groupId,
                seasonId,
                name: player.name,
            });
            showSuccessToast(`Created player "${player.name}".`);
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
            isPending={createPlayerMutation.isPending}
        />
    );
}
