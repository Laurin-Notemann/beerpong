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

import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import Text from '@/components/Text';
import { useTheme } from '@/theme';

const IN_PROGRESS_FADE_ANIMATION_SPEED = 200;

// Prefer waiting for `onCameraReady` after switching lenses, with a fallback timeout (simulators may not fire it).
const CAMERA_READY_FALLBACK_MS = 1000;

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

    const secondaryType = primaryType === 'back' ? 'front' : 'back';

    const [isCapturing, setIsCapturing] = useState(false);

    const overlayOpacity = useRef(new Animated.Value(0)).current;

    const [overlayBlocking, setOverlayBlocking] = useState(false);

    // Resolve when camera is ready after facing switch
    const resolveNextReadyRef = useRef<(() => void) | null>(null);

    const onCameraReady = useCallback(() => {
        // this never fires in the simulator!
        if (resolveNextReadyRef.current) {
            const resolve = resolveNextReadyRef.current;
            resolveNextReadyRef.current = null;
            resolve();
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
            await Promise.race([
                waitForNextCameraReady(),
                new Promise<void>((resolve) => {
                    timeoutId = setTimeout(resolve, CAMERA_READY_FALLBACK_MS);
                }),
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            // Ensure lingering resolver doesn't trigger later
            resolveNextReadyRef.current = null;
        }
    }, [waitForNextCameraReady]);

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
        const result = await cameraRef.current?.takePictureAsync({
            quality: 1,
            skipProcessing: true,
        });
        if (!result?.uri) throw new Error('No image from camera');
        return result.uri;
    }, []);

    const [err, setErr] = useState<Error | null>(null);

    const onTakePhotoPress = async () => {
        try {
            if (!camPerm?.granted) {
                const newPerm = await requestCamPerm();

                if (!newPerm.granted) {
                    setErr(new Error('Camera permission denied'));
                    return;
                }
            }
            setIsCapturing(true);

            // 1) Capture primary
            const firstUri = await takeOne();

            // 2) Switch to secondary, wait for camera to be ready
            setPrimaryType((t) => (t === 'back' ? 'front' : 'back'));
            await waitForReadyWithTimeout();

            // 3) Capture secondary
            const secondUri = await takeOne();

            // 4) Store based on which was which at start
            if (secondaryType === 'front') {
                onResult({
                    blueTeamPhotoUri: firstUri,
                    redTeamPhotoUri: secondUri,
                });
            } else {
                onResult({
                    blueTeamPhotoUri: secondUri,
                    redTeamPhotoUri: firstUri,
                });
            }
        } catch (error) {
            setErr(error as Error);
        } finally {
            setPrimaryType('back');
            setIsCapturing(false);
        }
    };

    const onFlipCameraPress = () =>
        setPrimaryType((t) => (t === 'back' ? 'front' : 'back'));

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
                        onCameraReady={onCameraReady}
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
        width: 94,
        height: 94,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    innerShutter: {
        width: 86,
        height: 86,
        borderRadius: 999,
        backgroundColor: 'white',

        borderWidth: 4,
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
