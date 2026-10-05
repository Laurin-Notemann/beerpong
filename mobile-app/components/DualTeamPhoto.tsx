import { useCameraPermissions } from 'expo-camera';
import { Image, ImageSource } from 'expo-image';
import { useMemo, useState } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';

import { Match } from '@/api/utils/matchDtoToMatch';
import {
    DualCameraView,
    DualCameraViewProps,
} from '@/components/DualCameraView';
import { Icon } from '@/components/Icon';
import { ScoreChip, Team } from '@/components/MatchVsHeader';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import PressableScale from '@/components/PressableScale';
import Text from '@/components/Text';
import { triggerHapticBump } from '@/haptics';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';

const FADE_CAMERA_IN_OUT_ANIMATION_SPEED = 200;

const SWAP_TEAMS_ANIMATION_SPEED = 100;
const SWAP_TEAMS_ANIMATION_SCALE = 0.98;
const SWAP_TEAMS_ANIMATION_BOUNCINESS = 14;

const PRESS_ANIMATION_SCALE = 0.98;
const PRESS_ANIMATION_SPEED = 200;
const PRESS_ANIMATION_BOUNCINESS = 8;

// how long a press has to be held to hide the small photo, BeReal-style
const PEEK_DELAY = 200;

type DualTeamPhotoMode = 'blueLarge' | 'redLarge' | 'equal';

export interface DualTeamPhotoProps {
    match: Pick<Match, 'blueTeam' | 'redTeam'>;
    blueImageSource?: ImageSource;
    redImageSource?: ImageSource;
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

    const [primaryScale] = useState(() => new Animated.Value(1));
    const [secondaryScale] = useState(() => new Animated.Value(1));

    const animatedShrinkStyle = useMemo(
        () => [{ transform: [{ scale: secondaryScale }] }],
        [secondaryScale]
    );
    const animatedGrowStyle = useMemo(
        () => [{ transform: [{ scale: primaryScale }] }],
        [primaryScale]
    );

    const [cameraModalVisible, setCameraModalVisible] = useState(false);
    const [cameraOpacity] = useState(() => new Animated.Value(0));

    const isEmpty = blueImageSource == null && redImageSource == null;

    // the team that was large last, so equal mode keeps its card stacking
    const [lastPrimary, setLastPrimary] = useState<'blue' | 'red'>(
        initialMode === 'redLarge' ? 'red' : 'blue'
    );

    const primary =
        mode === 'equal' ? lastPrimary : mode === 'blueLarge' ? 'blue' : 'red';

    const areEqualSize = mode === 'equal';

    // held down on a large photo: the small one hides until the finger lifts
    const [peeking, setPeeking] = useState(false);

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
        if (mode === 'equal') {
            triggerHapticBump('light');
            setMode('blueLarge');
            setLastPrimary('blue');
        } else if (mode === 'blueLarge') {
            triggerHapticBump('light');
            setMode('redLarge');
            setLastPrimary('red');
        } else {
            triggerHapticBump('selection');
            setMode('equal');
        }
    }

    const _onCameraResult: DualCameraViewProps['onResult'] = (result) => {
        onPhotoTaken(result);

        // give the photo time to render with the new state in the background
        setTimeout(closeCameraModal, 0);
    };

    const isPrimaryBlue = primary === 'blue';
    const cardBase = {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        overflow: 'hidden',
    } as const;

    const BlueCard = (
        <Animated.View
            style={[
                cardBase,
                {
                    borderColor: theme.color.team.blue,
                    borderWidth: 2,
                    height: areEqualSize ? smallHeight : '100%',
                },
                areEqualSize
                    ? smallSize
                    : isPrimaryBlue
                      ? undefined
                      : {
                            ...smallSize,
                            position: 'absolute',
                            top: 14,
                            left: 14,
                        },
                isPrimaryBlue ? animatedGrowStyle : animatedShrinkStyle,
                !isPrimaryBlue && { zIndex: 999 },
                peeking && !isPrimaryBlue && { opacity: 0 },
            ]}
        >
            <Team
                style={{ opacity: 0.7 }}
                size={areEqualSize || !isPrimaryBlue ? undefined : 54}
                centered
                players={match.blueTeam}
                color="blue"
            />
            <Image
                source={blueImageSource}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={100}
            />
        </Animated.View>
    );

    const RedCard = (
        <Animated.View
            style={[
                cardBase,
                {
                    borderColor: theme.color.team.red,
                    borderWidth: 2,
                    height: areEqualSize ? smallHeight : '100%',
                },
                areEqualSize
                    ? smallSize
                    : !isPrimaryBlue
                      ? undefined
                      : {
                            ...smallSize,
                            position: 'absolute',
                            top: 14,
                            left: 14,
                        },
                !isPrimaryBlue ? animatedGrowStyle : animatedShrinkStyle,
                peeking && isPrimaryBlue && { opacity: 0 },
            ]}
        >
            <Team
                style={{ opacity: 0.7 }}
                size={areEqualSize || isPrimaryBlue ? undefined : 54}
                centered
                players={match.redTeam}
                color="red"
            />
            <Image
                source={redImageSource}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={100}
            />
        </Animated.View>
    );

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
                            StyleSheet.absoluteFill,
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
                                    StyleSheet.absoluteFill,
                                    {
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end',
                                        paddingHorizontal: 20,
                                        paddingVertical: 16,
                                    },
                                ]}
                            >
                                <OverlayIconButton
                                    size="small"
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
                // a long press replaces the tap, so peeking doesn't also cycle the mode
                onLongPress={
                    isEmpty || areEqualSize
                        ? undefined
                        : () => {
                              triggerHapticBump('light');
                              setPeeking(true);
                          }
                }
                delayLongPress={PEEK_DELAY}
                onPressOut={() => setPeeking(false)}
                style={[
                    isEmpty && {
                        borderRadius: 18,
                        borderStyle: 'dashed',
                        borderWidth: 2,
                        borderColor: '#333',
                    },
                ]}
            >
                {!isEmpty && (
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',

                            opacity: editable ? 1 : 0,

                            marginTop: -12,
                        }}
                    >
                        {onSwapTeamColorsPress && (
                            <OverlayIconButton
                                blur={false}
                                iconName="swap-horizontal"
                                onPress={() => {
                                    triggerHapticBump('light');
                                    onSwapTeamColorsPress();
                                }}
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
                            onPress={() => {
                                triggerHapticBump('light');
                                _onTakePhoto();
                            }}
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
                                onPress={() => {
                                    triggerHapticBump('selection');
                                    onRemovePress();
                                }}
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
                        <>
                            {BlueCard}
                            {areEqualSize && <ScoreChip />}
                            {RedCard}
                        </>
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

    async function wrappedCallback() {
        if (camPerm?.granted) return onceWeHavePermission();

        const response = await requestCamPerm();
        if (response.granted) onceWeHavePermission();
    }
    return wrappedCallback;
}
