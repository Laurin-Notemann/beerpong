import Toast from 'react-native-root-toast';

import { useCreatePlayerMutation } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import CreateNewPlayer from '@/components/screens/CreateNewPlayer';
import { ConsoleLogger } from '@/utils/logging';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { mutateAsync } = useCreatePlayerMutation();

    async function onSubmit(player: { name: string }) {
        if (!groupId || !seasonId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                name: player.name,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to create player:', err);
            Toast.show('Failed to create player.', {
                duration: 1500,
                position: 1,
            });
        }
    }

    return <CreateNewPlayer onCreate={onSubmit} />;
}
