import { MenuView } from '@expo/ui/community/menu';

import { type Camera } from '@/api/calls/tvHooks';
import { Card, Chevron, Radio, Row } from '@/components/tvRemote/RemoteParts';
import {
    type DisplayConfig,
    type DisplayPatch,
    cameraPositions,
    cameraPositionLabel,
    cameraSubjectLabel,
    parseConfig,
} from '@/lib/tvDisplay';

/** Corners are TV settings; orientation and subject stay with each camera. */
export function CameraLayoutControls({
    config,
    cameras,
    send,
}: {
    config: DisplayConfig;
    cameras: Camera[];
    send: (patch: DisplayPatch) => void;
}) {
    return (
        <>
            <Card>
                <Row
                    icon="fullscreen"
                    title="Main camera background"
                    subtitle={
                        config.cameraMainEnabled
                            ? 'Full screen behind the corner feeds'
                            : 'Corner feeds only'
                    }
                    onPress={() =>
                        send({ cameraMainEnabled: !config.cameraMainEnabled })
                    }
                    trailing={<Radio on={config.cameraMainEnabled} />}
                />
            </Card>
            {cameraPositions.map((position) => {
                const corner = config.cameraCorners.find(
                    (c) => c.position === position
                );
                const camera = cameras.find((c) => c.id === corner?.cameraId);
                const others = config.cameraCorners.filter(
                    (c) => c.position !== position
                );
                const available = cameras.filter(
                    (c) => !others.some((slot) => slot.cameraId === c.id)
                );
                return (
                    <Card key={position}>
                        <MenuView
                            title={`${cameraPositionLabel[position]} camera`}
                            actions={[
                                {
                                    id: 'none',
                                    title: 'Off',
                                    state: !corner ? 'on' : 'off',
                                },
                                ...available.map((c) => ({
                                    id: c.id,
                                    title: `${c.name} · ${cameraSubjectLabel[parseConfig(c.config).cameraSubject]}`,
                                    state:
                                        corner?.cameraId === c.id
                                            ? ('on' as const)
                                            : ('off' as const),
                                })),
                            ]}
                            onPressAction={({ nativeEvent }) => {
                                if (nativeEvent.event === 'none')
                                    return send({ cameraCorners: others });
                                const chosen = available.find(
                                    (c) => c.id === nativeEvent.event
                                );
                                if (chosen)
                                    send({
                                        cameraCorners: [
                                            ...others,
                                            {
                                                position,
                                                cameraId: chosen.id,
                                                subject: parseConfig(
                                                    chosen.config
                                                ).cameraSubject,
                                                width: corner?.width ?? 30,
                                            },
                                        ],
                                    });
                            }}
                        >
                            <Row
                                icon="video-outline"
                                title={cameraPositionLabel[position]}
                                subtitle={
                                    corner
                                        ? `${camera?.name ?? 'Waiting for replacement'} · ${cameraSubjectLabel[corner.subject]}`
                                        : 'Off'
                                }
                                haptic={false}
                                trailing={<Chevron />}
                            />
                        </MenuView>
                        {corner && (
                            <MenuView
                                title="Camera size"
                                actions={[20, 30, 40, 50].map((width) => ({
                                    id: String(width),
                                    title: `${width}% of TV width`,
                                    state:
                                        corner.width === width
                                            ? ('on' as const)
                                            : ('off' as const),
                                }))}
                                onPressAction={({ nativeEvent }) => {
                                    const width = Number(nativeEvent.event);
                                    if ([20, 30, 40, 50].includes(width))
                                        send({
                                            cameraCorners:
                                                config.cameraCorners.map((c) =>
                                                    c.position === position
                                                        ? { ...c, width }
                                                        : c
                                                ),
                                        });
                                }}
                            >
                                <Row
                                    icon="resize"
                                    title="Camera size"
                                    subtitle={`${corner.width}% of TV width`}
                                    haptic={false}
                                    trailing={<Chevron />}
                                />
                            </MenuView>
                        )}
                    </Card>
                );
            })}
        </>
    );
}
