import {
    useCreatePlayerMutation,
    usePlayersQuery,
} from '@/api/calls/playerHooks';
import { useProfilesQuery } from '@/api/calls/profileHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import CreateNewPlayer from '@/components/screens/CreateNewPlayer';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);
    const profilesQuery = useProfilesQuery(groupId);

    const players = playersQuery.data?.data ?? [];
    const profiles = profilesQuery.data?.data ?? [];

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
            players={players}
            profiles={profiles}
            isPending={createPlayerMutation.isPending}
        />
    );
}
