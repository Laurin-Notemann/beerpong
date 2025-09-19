import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import { useTheme } from '@/theme';

// for saving leaderboards as pngs:

// import * as MediaLibrary from 'expo-media-library';

// const [mlPerm, requestMLPerm] = MediaLibrary.usePermissions();
// mlPerm?.granted

// import { captureRef } from 'react-native-view-shot';

// const compositeRef = useRef<View>(null);

// const [mlPerm, requestMLPerm] = MediaLibrary.usePermissions();

export function DualCameraView({
    onResult,
}: {
    onResult: (
        result: { blueTeamPhotoUri: string; redTeamPhotoUri: string } | null
    ) => void;
}) {
    const cameraRef = useRef<CameraView>(null);

    const [camPerm, requestCamPerm] = useCameraPermissions();

    const [primaryType, setPrimaryType] = useState<'front' | 'back'>('back');
    const secondaryType = primaryType === 'back' ? 'front' : 'back';

    const [isCapturing, setIsCapturing] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const [frontUri, setFrontUri] = useState<string | null>(null);
    const [backUri, setBackUri] = useState<string | null>(null);
    const [, setCompositeUri] = useState<string | null>(null);

    const primaryUri = primaryType === 'back' ? backUri : frontUri;
    const secondaryUri = secondaryType === 'back' ? backUri : frontUri;

    useEffect(() => {
        if (!previewMode && !camPerm?.granted) requestCamPerm();
    }, [camPerm, previewMode]);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const takeOne = useCallback(async () => {
        const result = await cameraRef.current?.takePictureAsync({
            quality: 1,
            skipProcessing: true,
        });
        if (!result?.uri) throw new Error('No image from camera');
        return result.uri;
    }, []);

    const onTakePhotoPress = useCallback(async () => {
        if (!camPerm?.granted) {
            await requestCamPerm();
            if (!camPerm?.granted) throw new Error('Camera permission denied');
        }
        setIsCapturing(true);
        setCompositeUri(null);
        try {
            // 1) Capture primary
            const firstUri = await takeOne();

            // 2) Switch to secondary, give the camera a moment to reconfigure
            setPrimaryType((t) => (t === 'back' ? 'front' : 'back'));
            await sleep(350);

            // 3) Capture secondary
            const secondUri = await takeOne();

            // 4) Store based on which was which at start
            if (secondaryType === 'front') {
                // primary was back, secondary is front
                setBackUri(firstUri);
                setFrontUri(secondUri);
                onResult({
                    blueTeamPhotoUri: firstUri,
                    redTeamPhotoUri: secondUri,
                });
            } else {
                // primary was front, secondary is back
                setFrontUri(firstUri);
                setBackUri(secondUri);
                onResult({
                    blueTeamPhotoUri: secondUri,
                    redTeamPhotoUri: firstUri,
                });
            }

            // 5) Show composed preview and snapshot the composed view
            setPreviewMode(true);
            // allow layout to finish
            await sleep(50);
            // const uri = await captureRef(compositeRef, {
            //     format: 'jpg',
            //     quality: 0.92,
            // });
            // setCompositeUri(uri);

            // // 6) Save to camera roll
            // if (mlPerm?.granted && uri) {
            //     await MediaLibrary.saveToLibraryAsync(uri);
            // }
        } finally {
            // Return UI to user-preferred primary (back by default here)
            setPrimaryType('back');
            setIsCapturing(false);
        }
    }, [camPerm?.granted, requestCamPerm, takeOne, secondaryType]);

    const onFlipCameraPress = () =>
        setPrimaryType((t) => (t === 'back' ? 'front' : 'back'));

    const onRetakePress = () => {
        setPreviewMode(false);
        onResult(null);
    };

    const theme = useTheme();

    if (!camPerm?.granted) {
        return (
            <View style={styles.center}>
                <Text>Requesting camera permission…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {!previewMode && (
                <View style={[styles.previewBox]}>
                    <CameraView
                        ref={cameraRef}
                        style={[
                            styles.camera,
                            {
                                borderColor: theme.color.team.blue,
                                borderWidth: 2,

                                borderRadius: 18,
                            },
                        ]}
                        ratio="4:3"
                        facing={primaryType}
                    />
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
                </View>
            )}

            {previewMode && (
                <View
                    style={{
                        position: 'relative',

                        flex: 1,
                    }}
                >
                    <DualTeamPhoto
                        blueLarge
                        match={{ blueTeam: [], redTeam: [] }}
                        blueImageSource={
                            primaryUri ? { uri: primaryUri } : undefined
                        }
                        redImageSource={
                            secondaryUri ? { uri: secondaryUri } : undefined
                        }
                    />
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                flexDirection: 'row',

                                justifyContent: 'flex-end',

                                paddingHorizontal: 20,
                                paddingVertical: 16,
                            },
                        ]}
                    >
                        <OverlayIconButton
                            iconName="close"
                            onPress={onRetakePress}
                        />
                    </View>
                </View>
            )}

            <View style={[styles.controls]}>
                {!previewMode && !isCapturing && (
                    <TakePhotoButton onPress={onTakePhotoPress} />
                )}
                {isCapturing && <ActivityIndicator />}
            </View>
        </View>
    );
}

function TakePhotoButton({ onPress }: { onPress: () => void }) {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={styles.shutter}
            onPress={onPress}
        >
            <View style={styles.innerShutter} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    previewBox: {
        position: 'relative',
        aspectRatio: 3 / 4, // 4:3 camera ratio -> container is 3:4 to fit height-first
        width: '100%',
    },
    camera: { width: '100%', height: '100%' },
    controls: {
        height: 94,

        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',

        marginTop: 84,
        paddingBottom: 84,
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

{
    /* <ViewShot
    ref={compositeRef}
    style={[
        styles.previewBox,
        previewMode
            ? {}
            : {
                  position: 'absolute',
                  opacity: 0,
                  pointerEvents: 'none',
              },

        DEBUG && {
            backgroundColor: previewMode ? 'green' : 'blue',
        },
    ]}
>
    {backUri && (
        <Image
            source={{ uri: backUri }}
            style={[
                styles.camera,
                {
                    borderColor: 'white',
                    borderWidth: 1,
                    marginTop: 100,
                },
            ]}
            resizeMode="cover"
        />
    )}
    {frontUri && (
        <View style={pipStyle}>
            <Image
                source={{ uri: frontUri }}
                style={{
                    width: '100%',
                    height: '100%',
                }}
                resizeMode="cover"
            />
        </View>
    )}
</ViewShot>; */
}
