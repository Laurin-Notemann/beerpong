import * as MediaLibrary from 'expo-media-library';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const DEBUG = true;

export function DualCameraView() {
    const cameraRef = useRef<CameraView>(null);
    const compositeRef = useRef<View>(null);

    const [camPerm, requestCamPerm] = useCameraPermissions();
    const [mlPerm, requestMLPerm] = MediaLibrary.usePermissions();

    const [primaryType, setPrimaryType] = useState<'front' | 'back'>('back');
    const secondaryType = primaryType === 'back' ? 'front' : 'back';

    const [pipCorner, setPipCorner] = useState<Corner>('top-right');
    const [isCapturing, setIsCapturing] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const [frontUri, setFrontUri] = useState<string | null>(null);
    const [backUri, setBackUri] = useState<string | null>(null);
    const [, setCompositeUri] = useState<string | null>(null);

    useEffect(() => {
        if (!camPerm?.granted) requestCamPerm();
        if (!mlPerm?.granted) requestMLPerm();
    }, [camPerm, mlPerm]);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const takeOne = useCallback(async () => {
        const result = await cameraRef.current?.takePictureAsync({
            quality: 1,
            skipProcessing: true,
        });
        if (!result?.uri) throw new Error('No image from camera');
        return result.uri;
    }, []);

    const captureBoth = useCallback(async () => {
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
            } else {
                // primary was front, secondary is back
                setFrontUri(firstUri);
                setBackUri(secondUri);
            }

            // 5) Show composed preview and snapshot the composed view
            setPreviewMode(true);
            // allow layout to finish
            await sleep(50);
            const uri = await captureRef(compositeRef, {
                format: 'jpg',
                quality: 0.92,
            });
            setCompositeUri(uri);

            // 6) Save to camera roll
            if (mlPerm?.granted && uri) {
                await MediaLibrary.saveToLibraryAsync(uri);
            }
        } finally {
            // Return UI to user-preferred primary (back by default here)
            setPrimaryType('back');
            setIsCapturing(false);
        }
    }, [
        camPerm?.granted,
        mlPerm?.granted,
        requestCamPerm,
        takeOne,
        secondaryType,
    ]);

    const cycleCorner = () => {
        setPipCorner((c) =>
            c === 'top-right'
                ? 'bottom-right'
                : c === 'bottom-right'
                  ? 'bottom-left'
                  : c === 'bottom-left'
                    ? 'top-left'
                    : 'top-right'
        );
    };

    const flipPrimary = () =>
        setPrimaryType((t) => (t === 'back' ? 'front' : 'back'));

    if (!camPerm?.granted) {
        return (
            <View style={styles.center}>
                <Text>Requesting camera permission…</Text>
            </View>
        );
    }

    const pipStyle = (() => {
        const base = {
            position: 'absolute' as const,
            width: 120,
            height: 160,
            borderRadius: 8,
            overflow: 'hidden' as const,
            borderWidth: 2,
            borderColor: 'white',
        };
        switch (pipCorner) {
            case 'top-left':
                return { ...base, top: 12, left: 12 };
            case 'top-right':
                return { ...base, top: 12, right: 12 };
            case 'bottom-left':
                return { ...base, bottom: 12, left: 12 };
            case 'bottom-right':
                return { ...base, bottom: 12, right: 12 };
        }
    })();

    return (
        <View style={styles.container}>
            <SafeAreaView>
                {!previewMode && (
                    <View
                        style={[
                            styles.previewBox,
                            DEBUG && { backgroundColor: 'orange' },
                        ]}
                    >
                        <CameraView
                            ref={cameraRef}
                            style={[
                                styles.camera,
                                DEBUG && { backgroundColor: 'red' },
                            ]}
                            ratio="4:3"
                            facing={primaryType}
                        />
                        {(primaryType === 'back' ? frontUri : backUri) && (
                            <View style={pipStyle}>
                                <Image
                                    source={{
                                        uri:
                                            primaryType === 'back'
                                                ? frontUri!
                                                : backUri!,
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </View>
                        )}
                    </View>
                )}

                <View style={{ backgroundColor: 'yellow' }}>
                    <ViewShot
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
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </View>
                        )}
                    </ViewShot>
                </View>

                <View
                    style={[
                        styles.controls,
                        DEBUG && { backgroundColor: 'purple' },
                    ]}
                >
                    <OverlayIconButton
                        iconName="swap-vertical"
                        onPress={flipPrimary}
                    />
                    <TouchableOpacity
                        activeOpacity={0.6}
                        style={styles.shutter}
                        onPress={captureBoth}
                        disabled={isCapturing}
                    >
                        <View style={styles.innerShutter} />
                    </TouchableOpacity>
                    <OverlayIconButton
                        iconName="cursor-move"
                        onPress={cycleCorner}
                    />
                </View>

                {previewMode && (
                    <View
                        style={[
                            styles.footer,
                            DEBUG && { backgroundColor: 'blue' },
                        ]}
                    >
                        <Text numberOfLines={1} style={{ color: 'white' }}>
                            Saved composite
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={styles.smallBtn}
                                onPress={() => setPreviewMode(false)}
                            >
                                <Text style={styles.btnText}>Retake</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    previewBox: {
        aspectRatio: 3 / 4, // 4:3 camera ratio -> container is 3:4 to fit height-first
        width: '100%',
        backgroundColor: 'black',
    },
    camera: { width: '100%', height: '100%' },
    controls: {
        marginTop: 'auto',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    btn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    smallBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    btnText: { color: 'white', fontWeight: '600' },
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
