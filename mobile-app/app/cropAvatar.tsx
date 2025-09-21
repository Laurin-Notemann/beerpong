import * as ImageManipulator from 'expo-image-manipulator';
import {
    ReactNativeZoomableView,
    ZoomableViewEvent,
} from '@openspacelabs/react-native-zoomable-view';
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
import { uriToByteArray } from '@/app/(tabs)/newMatch';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { deleteTemp, getTemp } from '@/app/tempRouteStore';
import Avatar from '@/components/Avatar';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useDebounce } from '@/utils/useDebounce';

const DEBUG = false;

export default function Page() {
    const { imageKey, profileId } = useLocalSearchParams<{
        imageKey: string;
        profileId: string;
    }>();

    const uri = imageKey ? getTemp<string>(imageKey) : undefined;

    const [croppedUri, setCroppedUri] = useState<string | null>(null);

    const { width, height } = Dimensions.get('window');

    const circleRadius = width / 1.3 / 2; // same as before
    const circleDiameter = circleRadius * 2;

    const nav = useNavigation();

    function onCancel() {
        if (imageKey) deleteTemp(imageKey);
        nav.goBack();
    }

    const [zoomLevel, setZoomLevel] = useState(1);

    // debounce so we don't continuously rerender while the user is zooming, only once when they're done
    const onZoomChange = useDebounce((v: number) => {
        setZoomLevel(v);
    }, 10);

    // we're not using useState here as that would rerender the entire page every time a user pans.
    const transformRef = useRef<ZoomableViewEvent | null>(null);

    const { groupId, seasonId } = useGroup();

    const uploadAvatarMutation = useUpdatePlayerAvatarMutation();

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
            const z = transformRef.current?.zoomLevel ?? 1;
            const offsetX = transformRef.current?.offsetX ?? 0;
            const offsetY = transformRef.current?.offsetY ?? 0;

            // displayed size
            const dispW = imgWidth! * z;
            const dispH = imgHeight! * z;

            // ✅ scale offsets by zoom to convert content-space pan -> screen-space pan
            const imgLeft = (width - dispW) / 2 + offsetX * z;
            const imgTop = (height - dispH) / 2 + offsetY * z;

            // circle box on screen
            const circleScreenX = (width - circleDiameter) / 2;
            const circleScreenY = (height - circleDiameter) / 2;

            // display -> raw
            const factorX = imgRawWidth! / imgWidth!;
            const factorY = imgRawHeight! / imgHeight!;

            const originX_px = ((circleScreenX - imgLeft) / z) * factorX;
            const originY_px = ((circleScreenY - imgTop) / z) * factorY;
            const cropW_px = (circleDiameter / z) * factorX;
            const cropH_px = (circleDiameter / z) * factorY;

            // clamp
            const clamp = (val: number, min: number, max: number) =>
                Math.max(min, Math.min(val, max));
            const originX = clamp(originX_px, 0, imgRawWidth - 1);
            const originY = clamp(originY_px, 0, imgRawHeight - 1);
            const cropW = clamp(cropW_px, 0, imgRawWidth - originX);
            const cropH = clamp(cropH_px, 0, imgRawHeight - originY);

            const { uri: rawCroppedUri } =
                await ImageManipulator.manipulateAsync(
                    uri,
                    [
                        {
                            crop: {
                                originX,
                                originY,
                                width: cropW,
                                height: cropH,
                            },
                        },
                    ],
                    { format: ImageManipulator.SaveFormat.PNG }
                );

            setCroppedUri(rawCroppedUri);

            if (DEBUG) return;

            const byteArray = await uriToByteArray(rawCroppedUri);

            await uploadAvatarMutation.mutateAsync({
                groupId,
                seasonId,
                profileId,
                byteArray,
                mimeType: 'image/png',
            });

            if (imageKey) deleteTemp(imageKey);
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
        if (!uri) return;
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

    useEffect(() => {
        return () => {
            if (imageKey) deleteTemp(imageKey);
        };
    }, [imageKey]);

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
                onTransform={(e) => {
                    transformRef.current = e;
                    onZoomChange(e.zoomLevel);
                }}
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
