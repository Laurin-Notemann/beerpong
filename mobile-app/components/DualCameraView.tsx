import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { env } from '@/api/env';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import Text from '@/components/Text';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';

const IN_PROGRESS_FADE_ANIMATION_SPEED = 200;

// Prefer waiting for `onCameraReady` after switching lenses, with a fallback timeout (simulators may not fire it).
const CAMERA_MAX_WAIT_MS = 1000;
const CAMERA_MIN_WAIT_MS = 500;

const RETRIES_ON_INACTIVE = 3;

export interface DualCameraPhoto {
    blueTeamPhotoUri: string;
    redTeamPhotoUri: string;
}

export interface DualCameraViewProps {
    onResult: (result: DualCameraPhoto) => void;
}
export function DualCameraView({ onResult }: DualCameraViewProps) {
    const cameraRef = useRef<CameraView>(null);

    const [camPerm, requestCamPerm] = useCameraPermissions();

    const [primaryType, setPrimaryType] = useState<'front' | 'back'>('back');

    const [flash, setFlash] = useState<'off' | 'torch'>('off');

    const [isCapturing, setIsCapturing] = useState(false);

    const overlayOpacity = useRef(new Animated.Value(0)).current;

    const [overlayBlocking, setOverlayBlocking] = useState(false);

    // Resolve when camera is ready after facing switch
    const resolveNextReadyRef = useRef<(() => void) | null>(null);

    const [cameraReady, setCameraReady] = useState(false);

    const onCameraReady = useCallback(() => {
        setCameraReady(true);
        // resolve pending waiter if you keep that mechanism:
        if (resolveNextReadyRef.current) {
            resolveNextReadyRef.current();
            resolveNextReadyRef.current = null;
        }
    }, []);

    const waitForNextCameraReady = useCallback(() => {
        return new Promise<void>((resolve) => {
            resolveNextReadyRef.current = resolve;
        });
    }, []);

    const waitForReadyWithTimeout = useCallback(async () => {
        let timeoutId: any;
        try {
            const minWait = new Promise<void>((resolve) =>
                setTimeout(resolve, CAMERA_MIN_WAIT_MS)
            );

            await Promise.all([
                minWait,
                Promise.race([
                    waitForNextCameraReady(),
                    new Promise<void>((resolve) => {
                        timeoutId = setTimeout(resolve, CAMERA_MAX_WAIT_MS);
                    }),
                ]),
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            resolveNextReadyRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isCapturing) {
            setOverlayBlocking(true);
            Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: IN_PROGRESS_FADE_ANIMATION_SPEED,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: IN_PROGRESS_FADE_ANIMATION_SPEED,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setOverlayBlocking(false);
            });
        }
    }, [isCapturing, overlayOpacity]);

    const cameraPermissionDenied = camPerm && !camPerm.granted;

    const cameraPermissionCantAskAgain = camPerm && !camPerm.canAskAgain;

    const takeOne = useCallback(async () => {
        let lastErr: unknown;
        for (let i = 0; i < RETRIES_ON_INACTIVE; i++) {
            try {
                const result = await cameraRef.current?.takePictureAsync({
                    quality: 1,
                    skipProcessing: true,
                });
                if (!result?.uri) throw new Error('No image from camera');
                return result.uri;
            } catch (e: any) {
                const msg = String(e?.message ?? e);
                if (msg.includes('No active and enabled video connection')) {
                    await new Promise((r) => setTimeout(r, 250));
                    lastErr = e;
                    continue;
                }
                throw e;
            }
        }
        throw lastErr ?? new Error('Camera not ready');
    }, []);

    const [err, setErr] = useState<Error | null>(null);

    const onTakePhotoPress = async () => {
        if (!camPerm?.granted || !cameraReady) return;

        const startFacing = primaryType;
        const nextFacing = startFacing === 'back' ? 'front' : 'back';

        setErr(null);
        setIsCapturing(true);

        try {
            // 1) Shot on current lens
            const firstUri = await takeOne();

            // 2) Flip and wait for the *new* session
            setCameraReady(false); // will be set true by onCameraReady
            setPrimaryType(nextFacing);
            await waitForReadyWithTimeout(); // or wait until cameraReady becomes true

            // 3) Second shot
            const secondUri = await takeOne();

            // 4) Map deterministically (no stale state)
            const frontUri = startFacing === 'front' ? firstUri : secondUri;
            const backUri = startFacing === 'back' ? firstUri : secondUri;

            triggerHapticBump('toast:success');
            onResult({
                // adjust mapping to your semantics:
                blueTeamPhotoUri: backUri,
                redTeamPhotoUri: frontUri,
            });
        } catch (error) {
            setErr(error as Error);
        } finally {
            // Optional: choose your post-flow lens policy.
            // Either stay on the *last used* lens:
            // setPrimaryType(nextFacing);
            // Or restore to where the user started:
            setPrimaryType(startFacing);

            setIsCapturing(false);
        }
    };

    const onFlipCameraPress = () => {
        triggerHapticBump('light');
        setPrimaryType((t) => (t === 'back' ? 'front' : 'back'));
    };
    const onToggleFlashPress = () => {
        triggerHapticBump('light');
        setFlash((f) => (f === 'off' ? 'torch' : 'off'));
    };

    const theme = useTheme();

    return (
        <View style={styles.container}>
            <View
                style={{
                    borderColor: theme.color.team.blue,
                    borderWidth: 2,

                    borderRadius: 18,

                    position: 'relative',
                    aspectRatio: 3 / 4, // 4:3 camera ratio -> container is 3:4 to fit height-first
                    width: '100%',

                    overflow: 'hidden',
                }}
            >
                <View
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                    ]}
                >
                    <Icon
                        name={
                            camPerm?.granted
                                ? 'camera-outline'
                                : 'camera-lock-outline'
                        }
                        color="rgba(255,255,255,0.15)"
                        size={48}
                    />
                    {cameraPermissionDenied && (
                        <Text
                            color="tertiary"
                            bold
                            style={{
                                marginTop: 16,
                                paddingHorizontal: 30,
                                textAlign: 'center',
                                lineHeight: 24,
                            }}
                        >
                            {cameraPermissionCantAskAgain ? (
                                'Please open your system settings and give Versus permission to use your camera.'
                            ) : (
                                <>
                                    {'Missing camera permission.\n'}
                                    <Text
                                        onPress={async () => {
                                            await requestCamPerm();
                                        }}
                                        color="link"
                                        bold
                                        style={{ lineHeight: 24 }}
                                    >
                                        Give permission
                                    </Text>
                                </>
                            )}
                        </Text>
                    )}
                </View>
                {camPerm?.granted && (
                    <CameraView
                        key={primaryType}
                        ref={cameraRef}
                        ratio="4:3"
                        facing={primaryType}
                        flash={flash as any}
                        onCameraReady={onCameraReady}
                        style={[
                            StyleSheet.absoluteFill,
                            env.isDev && { backgroundColor: 'tomato' },
                        ]}
                    />
                )}
                <View
                    style={{
                        flexDirection: 'row',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        top: 0,

                        justifyContent: 'space-between',
                        alignItems: 'flex-end',

                        paddingHorizontal: 20,
                        paddingVertical: 16,
                    }}
                >
                    <OverlayIconButton
                        size="large"
                        blur={false}
                        iconName={flash === 'torch' ? 'flash' : 'flash-off'}
                        onPress={onToggleFlashPress}
                    />
                    <OverlayIconButton
                        size="large"
                        blur={false}
                        iconName="autorenew"
                        onPress={onFlipCameraPress}
                    />
                </View>
                <Animated.View
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            justifyContent: 'center',
                            alignItems: 'center',

                            opacity: overlayOpacity,
                            pointerEvents: overlayBlocking ? 'auto' : 'none',
                        },
                    ]}
                >
                    <ActivityIndicator />
                </Animated.View>
            </View>

            <View style={[styles.controls]}>
                {err && (
                    <Text
                        color="negative"
                        style={{
                            textAlign: 'center',

                            position: 'absolute',

                            top: -48,
                        }}
                    >
                        Error: {err?.message || 'Unknown error'}
                    </Text>
                )}
                <TakePhotoButton
                    onPress={onTakePhotoPress}
                    disabled={isCapturing || !camPerm?.granted}
                />
            </View>
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        opacity: overlayOpacity,
                        pointerEvents: overlayBlocking ? 'auto' : 'none',
                    },
                ]}
            />
        </View>
    );
}

function TakePhotoButton({
    onPress,
    disabled = false,
}: {
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={styles.shutter}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={styles.innerShutter} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    camera: { width: '100%', height: '100%' },
    controls: {
        position: 'relative',

        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',

        marginTop: 84,
        marginBottom: 84,
    },
    shutter: {
        width: 76,
        height: 76,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    innerShutter: {
        width: 68,
        height: 68,
        borderRadius: 999,
        backgroundColor: 'white',

        borderWidth: 3,
        borderColor: 'black',
    },
    shutterText: { color: 'black', fontSize: 28, lineHeight: 28 },
    footer: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
