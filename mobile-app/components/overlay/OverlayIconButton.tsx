import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import PressableScale from '@/components/PressableScale';
import { useTheme } from '@/theme';

export function OverlayIconButton({
    iconName,
    onPress,
    onPressIn,
    onPressOut,
    backgroundColor,
    disabled = false,
    content,
    blur = true,
    size = 'large',
}: {
    iconName: string;
    onPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;

    backgroundColor?: string;
    disabled?: boolean;
    content?: React.ReactNode;
    blur?: boolean;
    size?: 'small' | 'medium' | 'large';
}) {
    const theme = useTheme();

    return (
        <PressableScale
            pressedScale={0.9}
            disabled={disabled}
            style={{
                width: size === 'small' ? 24 : 48,
                height: size === 'small' ? 24 : 48,

                borderRadius: 99,
                overflow: 'hidden',
            }}
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
        >
            <BlurView
                intensity={blur ? 70 : 0}
                tint={theme.blur.tint}
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',

                    width: size === 'small' ? 24 : 48,
                    height: size === 'small' ? 24 : 48,

                    backgroundColor: disabled
                        ? '#333'
                        : backgroundColor || theme.overlay.backgroundColor,
                }}
            >
                <Icon
                    name={iconName}
                    color={
                        blur
                            ? theme.color.text.secondary
                            : theme.color.text.primary
                    }
                    size={size === 'large' ? 24 : 16}
                />
            </BlurView>
            {content}
        </PressableScale>
    );
}
