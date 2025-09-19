import { BlurView } from 'expo-blur';
import { ActivityIndicator } from 'react-native';

import PressableScale from '@/components/PressableScale';
import Text from '@/components/Text';
import { useTheme } from '@/theme';

export function OverlayTextButton({
    title,
    onPress,
    backgroundColor,
    isPending = false,
    fullWidth = false,
}: {
    title: React.ReactNode;
    onPress?: () => void;
    backgroundColor?: string;
    isPending?: boolean;
    fullWidth?: boolean;
}) {
    const theme = useTheme();

    return (
        <PressableScale
            fullWidth={fullWidth}
            onPress={onPress}
            style={{
                height: 48,

                borderRadius: 8,
                overflow: 'hidden',

                flex: fullWidth ? 1 : undefined,
            }}
            disabled={isPending}
        >
            <BlurView
                intensity={70}
                tint={theme.blur.tint}
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',

                    height: 48,
                    paddingHorizontal: 16,

                    backgroundColor:
                        backgroundColor || theme.overlay.backgroundColor,
                }}
            >
                {isPending && <ActivityIndicator />}
                {!isPending && (
                    <Text
                        style={{
                            fontWeight: '600',
                            fontSize: 17,
                        }}
                    >
                        {title}
                    </Text>
                )}
            </BlurView>
        </PressableScale>
    );
}
