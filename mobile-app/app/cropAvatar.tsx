import * as ImageManipulator from 'expo-image-manipulator';
import {
    ReactNativeZoomableView,
    ZoomableViewEvent,
} from '@openspacelabs/react-native-zoomable-view';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { useUpdatePlayerAvatarMutation } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { QK, replaceWildcards } from '@/api/utils/reactQuery';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

const DEBUG = false;

export default function Page() {
    const { uri, profileId } = useLocalSearchParams<{
        uri: string;
        profileId: string;
    }>();

    const [croppedUri, setCroppedUri] = useState<string | null>(null);

    const { width, height } = Dimensions.get('window');

    const circleRadius = width / 1.3 / 2; // same as before
    const circleDiameter = circleRadius * 2;

    const nav = useNavigation();

    function onCancel() {
        nav.goBack();
    }

    const [zoomLevel, setZoomLevel] = useState(1);

    // we're not using useState here as that would rerender the entire page every time a user pans.
    const transformRef = useRef<ZoomableViewEvent | null>(null);

    const { groupId, seasonId } = useGroup();

    const uploadAvatarMutation = useUpdatePlayerAvatarMutation();

    const qc = useQueryClient();

    const [isLoading, setIsLoading] = useState(false);

    const [imgRawWidth, setImgimgRawWidth] = useState<number | null>(null);
    const [imgRawHeight, setImgimgRawHeight] = useState<number | null>(null);
    const [imgWidth, setImgWidth] = useState<number | null>(null);
    const [imgHeight, setImgHeight] = useState<number | null>(null);

    async function onChoose() {
        if (
            !groupId ||
            !seasonId ||
            !uri ||
            imgWidth == null ||
            imgHeight == null ||
            imgRawHeight == null ||
            imgRawWidth == null
        )
            return;

        setIsLoading(true);

        try {
            const { offsetX = 0, offsetY = 0 } = transformRef.current ?? {};

            const dispZoomW = imgWidth * zoomLevel;
            const dispZoomH = imgHeight * zoomLevel;

            // b) where is the top‐left of the zoomed image on‐screen?
            //    Since the ZoomableView always “centers” it by default,
            //    initial top‐left = (screenW–dispZoomW)/2, (imgHeight–dispZoomH)/2
            //    Then user panning adds offsetX / offsetY.
            const imgLeft = (width - dispZoomW) / 2 + offsetX;
            const imgTop = (imgHeight - dispZoomH) / 2 + offsetY;

            // c) the circle’s bounding box _in screen‐coords_:
            //    (circle is centered on the entire screen’s width and at Y = imgHeight/2)
            //    NOTE: since your ZoomableView only spans the “display height” of the image (imgHeight),
            //    the vertical center of that view is at y = imgHeight/2.
            const circleScreenX = (width - circleDiameter) / 2;
            const circleScreenY = (imgHeight - circleDiameter) / 2;

            // d) find where that bounding‐square sits *relative to the zoomed‐image top‐left*:
            const overlapX_zoomed = circleScreenX;
            const overlapY_zoomed = circleScreenY;

            // e) convert that “zoomed‐image offset” back to “original image pixels”:
            //    1) dividing by zoomLevel takes us from “zoomed display px” → “display px”
            //    2) multiply (imgRawWidth / imgWidth) to convert “display px” → “raw px”
            const factorX = imgRawWidth / imgWidth;
            const factorY = imgRawHeight / imgHeight;

            const originX_px = (overlapX_zoomed / zoomLevel) * factorX;
            const originY_px = (overlapY_zoomed / zoomLevel) * factorY;

            // f) similarly, how wide/high is that circle‐box in raw pixels?
            const cropW_px = (circleDiameter / zoomLevel) * factorX;
            const cropH_px = (circleDiameter / zoomLevel) * factorY;

            //
            // === 4) Now we have (originX_px, originY_px, cropW_px, cropH_px) in original pixels.
            //     Clamp to valid ranges to avoid “out of bounds” errors:
            //
            const clamp = (val: number, min: number, max: number) =>
                Math.max(min, Math.min(val, max));

            const originX = clamp(originX_px, 0, imgRawWidth - 1);
            const originY = clamp(originY_px, 0, imgRawHeight - 1);
            const cropW = clamp(cropW_px, 0, imgRawWidth - originX);
            const cropH = clamp(cropH_px, 0, imgRawHeight - originY);

            const circleDiameterOnImg = imgRawHeight / zoomLevel;

            const { uri: rawCroppedUri } =
                await ImageManipulator.manipulateAsync(
                    uri,
                    [
                        {
                            crop: {
                                originX,
                                // originX:
                                //     (imgRawWidth - circleDiameterOnImg) / 2 -
                                //     (offsetX * factorX) / zoomLevel,
                                originY,
                                // originY:
                                //     (imgRawHeight - circleDiameterOnImg) / 2 -
                                //     (offsetY * factorY) / zoomLevel,
                                width: cropW,
                                height: cropH,
                            },
                        },
                    ],
                    { format: ImageManipulator.SaveFormat.PNG }
                );

            setCroppedUri(rawCroppedUri);

            if (DEBUG) return;

            const resp = await fetch(rawCroppedUri);
            const buffer = await resp.arrayBuffer();
            const byteArray = new Uint8Array(buffer);

            await uploadAvatarMutation.mutateAsync({
                groupId,
                seasonId,
                profileId,
                byteArray,
                mimeType: 'image/png',
            });

            await qc.invalidateQueries({
                predicate: replaceWildcards([
                    QK.group,
                    groupId,
                    QK.season,
                    '*',
                    QK.players,
                ]),
            });
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to upload player avatar:', err);
            showErrorToast('Failed to upload player avatar.');
        } finally {
            setIsLoading(false);
        }
    }
    const minZoom: number =
        imgWidth == null || imgHeight == null
            ? 1
            : Math.max(circleDiameter / imgWidth, circleDiameter / imgHeight);

    useEffect(() => {
        Image.getSize(
            uri,
            (imgRawWidth, imgRawHeight) => {
                const calculatedHeight = (imgRawHeight / imgRawWidth) * width;
                const calculatedWidth = width;

                setImgWidth(calculatedWidth);
                setImgHeight(calculatedHeight);
                setImgimgRawWidth(imgRawWidth);
                setImgimgRawHeight(imgRawHeight);

                const zoomFactor = Math.max(
                    circleDiameter / calculatedWidth,
                    circleDiameter / calculatedHeight
                );

                ref.current?.zoomTo(zoomFactor);
            },
            (err) => {
                ConsoleLogger.error('Failed to get image size:', err);
            }
        );
    }, [uri, width]);

    const ref = useRef<ReactNativeZoomableView | null>(null);

    return (
        <View
            style={{
                flex: 1,

                backgroundColor: '#000',
            }}
        >
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    title: 'Move and scale',
                    headerLeft: () => false,
                    headerRight: () => false,
                    headerBackground: () => null,
                }}
            />
            <ReactNativeZoomableView
                ref={ref}
                minZoom={minZoom}
                maxZoom={3}
                zoomStep={0.5}
                bindToBorders={true}
                onTransform={(e) => setZoomLevel(e.zoomLevel)}
                style={{ width, height }}
                contentWidth={imgWidth! + (width - circleDiameter) / zoomLevel}
                contentHeight={
                    imgHeight! + (height - circleDiameter) / zoomLevel
                }
            >
                <Image
                    source={{ uri }}
                    style={{
                        resizeMode: 'cover',

                        width: '100%',

                        height: imgHeight ?? '100%',

                        backgroundColor: '#000',
                    }}
                />
            </ReactNativeZoomableView>
            <View
                style={{
                    position: 'absolute',
                    flex: 1,

                    pointerEvents: 'none',
                }}
            >
                <Svg width={width} height={height}>
                    <Defs>
                        <Mask id="holeMask">
                            <Rect width="100%" height="100%" fill="white" />
                            <Circle
                                cx={width / 2}
                                cy={height / 2}
                                r={circleRadius}
                                fill="black"
                            />
                        </Mask>
                    </Defs>

                    <Rect
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.7)"
                        mask="url(#holeMask)"
                    />
                </Svg>
            </View>
            {DEBUG && (
                <SafeAreaView
                    style={{
                        position: 'absolute',
                    }}
                >
                    <Avatar url={croppedUri} size={128} />
                </SafeAreaView>
            )}
            <SafeAreaView
                style={{
                    position: 'absolute',
                    flexDirection: 'row',
                    bottom: 0,
                }}
            >
                <TouchableOpacity
                    onPress={onCancel}
                    style={{
                        paddingVertical: 20,
                        paddingHorizontal: 32,
                    }}
                >
                    <Text
                        style={{
                            color: 'white',
                            fontWeight: 500,
                            fontSize: 18,
                        }}
                    >
                        Cancel
                    </Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                    disabled={isLoading}
                    onPress={onChoose}
                    style={{
                        paddingVertical: 20,
                        paddingHorizontal: 32,
                    }}
                >
                    <Text
                        style={{
                            color: 'white',
                            fontWeight: 500,
                            fontSize: 18,
                        }}
                    >
                        {isLoading ? <ActivityIndicator /> : 'Choose'}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}
