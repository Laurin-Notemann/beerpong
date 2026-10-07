import { MenuView } from '@expo/ui/community/menu';

import { usePhoneCamera } from '@/api/calls/tvHooks';
import { Chevron, Row } from '@/components/tvRemote/RemoteParts';
import { useNavigation } from '@/lib/navigation/useNavigation';

/** Both camera entry points offer the same destinations. */
export function PhoneCameraRow({ groupId }: { groupId: string | null }) {
    const nav = useNavigation();
    const camera = usePhoneCamera(groupId);
    return (
        <MenuView
            title="Use this phone"
            actions={[
                {
                    id: 'app',
                    title: 'In app',
                    attributes: { disabled: !groupId || camera.isPending },
                },
                {
                    id: 'browser',
                    title: 'Browser',
                    attributes: { disabled: !groupId || camera.isPending },
                },
            ]}
            onPressAction={({ nativeEvent }) => {
                if (!groupId || camera.isPending) return;
                if (nativeEvent.event === 'app')
                    nav.navigate('tvCamera', { groupId });
                if (nativeEvent.event === 'browser') camera.mutate('browser');
            }}
        >
            <Row
                icon="cellphone"
                title={camera.isPending ? 'Opening camera…' : 'Use this phone'}
                subtitle="Choose In app or Browser · already paired"
                haptic={false}
                trailing={<Chevron />}
            />
        </MenuView>
    );
}
