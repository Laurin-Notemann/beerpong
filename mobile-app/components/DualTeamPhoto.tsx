import { useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Image,
    ImageSourcePropType,
    Modal,
    StyleSheet,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Match } from '@/api/utils/matchDtoToMatch';
import { useInsets } from '@/app/useInsets';
import {
    DualCameraView,
    DualCameraViewProps,
} from '@/components/DualCameraView';
import { ScoreChip, Team } from '@/components/MatchVsHeader';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import PressableScale from '@/components/PressableScale';
import Text from '@/components/Text';
import { useTheme } from '@/theme';

const FADE_CAMERA_IN_OUT_ANIMATION_SPEED = 200;

const SWAP_TEAMS_ANIMATION_SPEED = 100;
const SWAP_TEAMS_ANIMATION_SCALE = 0.98;
const SWAP_TEAMS_ANIMATION_BOUNCINESS = 14;

const PRESS_ANIMATION_SCALE = 0.98;
const PRESS_ANIMATION_SPEED = 200;
const PRESS_ANIMATION_BOUNCINESS = 8;

type DualTeamPhotoMode = 'blueLarge' | 'redLarge' | 'equal';

export interface DualTeamPhotoProps {
    match: Pick<Match, 'blueTeam' | 'redTeam'>;
    blueImageSource?: ImageSourcePropType;
    redImageSource?: ImageSourcePropType;
    initialMode?: DualTeamPhotoMode;

    onSwapTeamColorsPress?: () => void;
    onRemovePress?: () => void;
    editable?: boolean;

    onPhotoTaken: DualCameraViewProps['onResult'];
}
export function DualTeamPhoto({
    match,
    blueImageSource,
    redImageSource,
    initialMode = 'equal',
    onSwapTeamColorsPress,
    onRemovePress,
    editable = false,

    onPhotoTaken,
}: DualTeamPhotoProps) {
    const theme = useTheme();

    const insets = useInsets(true, true);

    const [mode, setMode] = useState<DualTeamPhotoMode>(initialMode);

    const primaryScale = useRef(new Animated.Value(1)).current;
    const secondaryScale = useRef(new Animated.Value(1)).current;

    const animatedShrinkStyle = useMemo(
        () => [{ transform: [{ scale: secondaryScale }] }],
        [secondaryScale]
    );
    const animatedGrowStyle = useMemo(
        () => [{ transform: [{ scale: primaryScale }] }],
        [primaryScale]
    );

    const [cameraModalVisible, setCameraModalVisible] = useState(false);
    const cameraOpacity = useRef(new Animated.Value(0)).current;

    const isEmpty = blueImageSource == null && redImageSource == null;

    const primary =
        mode === 'equal' ? 'blue' : mode === 'blueLarge' ? 'blue' : 'red';

    const secondary = primary === 'blue' ? 'red' : 'blue';

    const areEqualSize = mode === 'equal';

    const aspectRatio = 4 / 3;

    const smallHeight = 196;
    const largeHeight = 16 * 32;

    const _onTakePhoto = useRequestCameraPermission(_showCameraModal);

    const smallSize = { width: smallHeight / aspectRatio, height: smallHeight };

    const animatePrimary = (to: number) =>
        Animated.spring(primaryScale, {
            toValue: to,
            useNativeDriver: true,
            speed: SWAP_TEAMS_ANIMATION_SPEED,
            bounciness: SWAP_TEAMS_ANIMATION_BOUNCINESS,
        }).start();

    const animateSecondary = (to: number) =>
        Animated.spring(secondaryScale, {
            toValue: to,
            useNativeDriver: true,
            speed: SWAP_TEAMS_ANIMATION_SPEED,
            bounciness: SWAP_TEAMS_ANIMATION_BOUNCINESS,
        }).start();

    function _showCameraModal() {
        setCameraModalVisible(true);
        cameraOpacity.setValue(0);
        Animated.timing(cameraOpacity, {
            toValue: 1,
            duration: FADE_CAMERA_IN_OUT_ANIMATION_SPEED,
            useNativeDriver: true,
        }).start();
    }

    function closeCameraModal() {
        Animated.timing(cameraOpacity, {
            toValue: 0,
            duration: FADE_CAMERA_IN_OUT_ANIMATION_SPEED,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setCameraModalVisible(false);
        });
    }

    function _onCycleMode() {
        setMode((current) => {
            if (current === 'equal') return 'blueLarge';
            if (current === 'blueLarge') return 'redLarge';
            if (current === 'redLarge') return 'equal';

            throw new Error('unreachable');
        });
    }

    const _onCameraResult: DualCameraViewProps['onResult'] = (result) => {
        onPhotoTaken(result);

        // give the photo time to render with the new state in the background
        setTimeout(closeCameraModal, 0);
    };

    return (
        <>
            {cameraModalVisible && (
                <Modal
                    visible
                    transparent
                    animationType="none"
                    onRequestClose={closeCameraModal}
                >
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                backgroundColor: 'black',
                                opacity: cameraOpacity,

                                paddingTop: insets.top,
                            },
                        ]}
                    >
                        <View style={{ flex: 1 }}>
                            <DualCameraView onResult={_onCameraResult} />
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
                                    onPress={closeCameraModal}
                                />
                            </View>
                        </View>
                    </Animated.View>
                </Modal>
            )}
            <PressableScale
                pressedScale={PRESS_ANIMATION_SCALE}
                speed={PRESS_ANIMATION_SPEED}
                bounciness={PRESS_ANIMATION_BOUNCINESS}
                onPress={isEmpty ? _onTakePhoto : _onCycleMode}
                style={[
                    isEmpty && {
                        borderRadius: 18,
                        borderStyle: 'dashed',
                        borderWidth: 2,
                        borderColor: '#333',
                    },
                ]}
            >
                {!isEmpty && editable && (
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                        }}
                    >
                        {onSwapTeamColorsPress && (
                            <OverlayIconButton
                                blur={false}
                                iconName="swap-horizontal"
                                onPress={onSwapTeamColorsPress}
                                onPressIn={() => {
                                    animatePrimary(
                                        1 / SWAP_TEAMS_ANIMATION_SCALE
                                    );
                                    animateSecondary(
                                        SWAP_TEAMS_ANIMATION_SCALE
                                    );
                                }}
                                onPressOut={() => {
                                    animatePrimary(1);
                                    animateSecondary(1);
                                }}
                            />
                        )}
                        <OverlayIconButton
                            blur={false}
                            iconName="camera-retake-outline"
                            onPress={_onTakePhoto}
                            onPressIn={() => {
                                animatePrimary(1 / SWAP_TEAMS_ANIMATION_SCALE);
                                animateSecondary(
                                    1 / SWAP_TEAMS_ANIMATION_SCALE
                                );
                            }}
                            onPressOut={() => {
                                animatePrimary(1);
                                animateSecondary(1);
                            }}
                        />
                        {onRemovePress && (
                            <OverlayIconButton
                                blur={false}
                                iconName="close"
                                onPress={onRemovePress}
                                onPressIn={() => {
                                    animatePrimary(SWAP_TEAMS_ANIMATION_SCALE);
                                    animateSecondary(
                                        SWAP_TEAMS_ANIMATION_SCALE
                                    );
                                }}
                                onPressOut={() => {
                                    animatePrimary(1);
                                    animateSecondary(1);
                                }}
                            />
                        )}
                    </View>
                )}
                <View
                    style={{
                        flexDirection: areEqualSize ? 'row' : undefined,
                        alignItems: areEqualSize ? 'center' : undefined,
                        justifyContent: 'space-between',
                        position: 'relative',

                        height: isEmpty
                            ? 48
                            : areEqualSize
                              ? smallHeight
                              : largeHeight,
                    }}
                >
                    {!isEmpty && (
                        <Animated.View
                            style={[
                                {
                                    alignItems: 'center',
                                    justifyContent: 'center',

                                    borderRadius: 18,

                                    borderColor: theme.color.team[primary],
                                    borderWidth: 2,

                                    height: '100%',

                                    overflow: 'hidden',
                                },
                                areEqualSize && smallSize,
                                animatedGrowStyle,
                            ]}
                        >
                            <Team
                                style={{ opacity: 0.7 }}
                                size={areEqualSize ? undefined : 54}
                                centered
                                players={
                                    primary === 'blue'
                                        ? match.blueTeam
                                        : match.redTeam
                                }
                                color={primary}
                            />
                            <Image
                                source={
                                    primary === 'blue'
                                        ? blueImageSource
                                        : redImageSource
                                }
                                style={StyleSheet.absoluteFillObject}
                                resizeMode="cover"
                            />
                        </Animated.View>
                    )}
                    {areEqualSize && !isEmpty && <ScoreChip />}
                    {!isEmpty && (
                        <Animated.View
                            style={[
                                {
                                    alignItems: 'center',
                                    justifyContent: 'center',

                                    borderRadius: 18,

                                    borderColor: theme.color.team[secondary],
                                    borderWidth: 2,

                                    overflow: 'hidden',
                                },
                                smallSize,
                                areEqualSize
                                    ? undefined
                                    : {
                                          position: 'absolute',
                                          top: 14,
                                          left: 14,
                                      },
                                animatedShrinkStyle,
                            ]}
                        >
                            <Team
                                style={{ opacity: 0.7 }}
                                centered
                                players={
                                    secondary === 'blue'
                                        ? match.blueTeam
                                        : match.redTeam
                                }
                                color={secondary}
                            />
                            <Image
                                source={
                                    secondary === 'blue'
                                        ? blueImageSource
                                        : redImageSource
                                }
                                style={StyleSheet.absoluteFillObject}
                                resizeMode="cover"
                            />
                        </Animated.View>
                    )}
                    {isEmpty && (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',

                                flex: 1,

                                gap: 6,
                            }}
                        >
                            <Icon
                                name="camera"
                                size={16}
                                color={theme.color.text.tertiary}
                            />
                            <Text bold color="tertiary">
                                Take team photos
                            </Text>
                        </View>
                    )}
                </View>
            </PressableScale>
        </>
    );
}

/**
 * if we have camera permission, fires the callback immediately.
 * if not, prompts the user for permission, and if granted, fires the callback.
 */
function useRequestCameraPermission(onceWeHavePermission: () => void) {
    const [camPerm, requestCamPerm] = useCameraPermissions();

    const [
        openCameraAsSoonAsWeHavePermission,
        setOpenCameraAsSoonAsWeHavePermission,
    ] = useState(false);

    useEffect(() => {
        setOpenCameraAsSoonAsWeHavePermission((shouldOpen) => {
            if (shouldOpen && camPerm?.granted) onceWeHavePermission();

            return false;
        });
    }, [camPerm, openCameraAsSoonAsWeHavePermission]);

    function wrappedCallback() {
        if (camPerm?.granted) return onceWeHavePermission();

        requestCamPerm();
        setOpenCameraAsSoonAsWeHavePermission(true);
    }
    return wrappedCallback;
}
