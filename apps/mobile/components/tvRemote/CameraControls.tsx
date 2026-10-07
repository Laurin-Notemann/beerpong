import { MenuView } from '@expo/ui/community/menu';
import { Alert } from 'react-native';

import { Camera, useRemoveCamera, useUpdateCamera } from '@/api/calls/tvHooks';
import { Card, Chevron, Radio, Row } from '@/components/tvRemote/RemoteParts';
import {
    cameraSubjectLabel,
    type CameraRotation,
    cameraSubjects,
    parseConfig,
} from '@/lib/tvDisplay';

/** Settings belong to the camera, so selecting it on another TV keeps its orientation. */
export function CameraControls({
    groupId,
    camera,
}: {
    groupId: string | null;
    camera: Camera;
}) {
    const update = useUpdateCamera(groupId, camera.id);
    const remove = useRemoveCamera(groupId);
    // Older persisted camera lists have no config yet.
    const config = parseConfig(camera.config);
    return (
        <Card>
            <MenuView
                title={camera.name}
                actions={[
                    ...cameraSubjects.map((subject) => ({
                        id: subject,
                        title: cameraSubjectLabel[subject],
                        state:
                            config.cameraSubject === subject
                                ? ('on' as const)
                                : ('off' as const),
                    })),
                    {
                        id: 'remove',
                        title: 'Remove Camera',
                        attributes: { destructive: true },
                    },
                ]}
                onPressAction={({ nativeEvent }) => {
                    const subject = cameraSubjects.find(
                        (s) => s === nativeEvent.event
                    );
                    if (subject) update.mutate({ cameraSubject: subject });
                    else if (nativeEvent.event === 'remove')
                        Alert.alert(
                            'Remove Group from Camera',
                            'The camera shows its code again. Add a replacement and choose what it shows.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () => remove.mutate(camera.id),
                                },
                            ]
                        );
                }}
            >
                <Row
                    icon="video-outline"
                    title={camera.name}
                    subtitle={`Showing ${cameraSubjectLabel[config.cameraSubject]}`}
                    haptic={false}
                    trailing={<Chevron />}
                />
            </MenuView>
            <Row
                icon="rotate-right"
                title="Rotate camera video"
                subtitle={`${config.cameraRotation}° · tap to turn 90°`}
                onPress={() =>
                    update.mutate({
                        cameraRotation: ((config.cameraRotation + 90) %
                            360) as CameraRotation,
                    })
                }
                trailing={<Chevron />}
            />
            <Row
                icon="swap-horizontal"
                title="Flip camera video"
                subtitle={
                    config.cameraVideoFlipped
                        ? 'Mirrored horizontally'
                        : 'Original orientation'
                }
                selected={config.cameraVideoFlipped}
                onPress={() =>
                    update.mutate({
                        cameraVideoFlipped: !config.cameraVideoFlipped,
                    })
                }
                trailing={<Radio on={config.cameraVideoFlipped} />}
            />
        </Card>
    );
}
