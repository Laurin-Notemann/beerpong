import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme';
import { formatPlacement } from '@/utils/format';

const borderRadius = 999;

function Badge({
    children,
    circular = true,
}: PropsWithChildren & { circular?: boolean }) {
    const theme = useTheme();
    return (
        <View
            style={{
                position: 'absolute',

                right: 0,
                bottom: 0,

                width: circular ? 32 : undefined,
                height: circular ? 32 : undefined,

                alignItems: 'center',
                justifyContent: 'center',

                paddingHorizontal: circular ? undefined : 4,

                backgroundColor: theme.avatar.badge.bg,

                borderRadius: circular ? borderRadius : 4,

                shadowOffset: {
                    width: 0,
                    height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            }}
        >
            {children}
        </View>
    );
}

export interface AvatarProps {
    url?: string | null;
    name?: string;
    content?: string;
    size?: 128 | 96 | 40 | 36 | number;

    style?: any;

    borderColor?: string;

    canUpload?: boolean;
    placement?: number;
    isUnranked?: boolean;

    onPress?: () => void;
}
export default function Avatar({
    url,
    name,
    content,
    size = 36,
    style = {},
    borderColor,
    canUpload = false,
    placement,
    isUnranked = false,

    onPress,
}: AvatarProps) {
    const theme = useTheme();

    return (
        <Pressable
            style={{
                width: size,
                height: size,

                ...style,
            }}
            onPress={onPress}
            // so an avatar without an onPress doesn't intercept clicks
            disabled={onPress == null}
        >
            <View
                style={{
                    borderRadius: borderRadius,
                    overflow: 'hidden',
                }}
            >
                {(theme.blur?.intensity ?? 0) !== 0 && (
                    <BlurView
                        intensity={theme.blur?.intensity ?? 0}
                        tint={theme.blur?.tint}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: size,
                            height: size,

                            backgroundColor: theme.avatar.bg,
                        }}
                    />
                )}
                <View
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',

                        width: size,
                        height: size,

                        borderRadius: borderRadius,

                        backgroundColor: !!theme.blur?.intensity
                            ? undefined
                            : theme.avatar.bg,

                        borderWidth: borderColor ? 2 : undefined,
                        borderColor,
                    }}
                >
                    {url && !content && (
                        <Image
                            source={{ uri: url }}
                            style={{
                                position: 'absolute',
                                zIndex: 1,

                                width: size,
                                height: size,
                                borderRadius: borderRadius,

                                borderWidth: borderColor ? 2 : undefined,
                                borderColor,
                            }}
                            resizeMode="cover"
                            cachePolicy="memory-disk"
                            transition={100} // fade in
                        />
                    )}

                    <ThemedText
                        style={{
                            lineHeight: size,
                            fontSize: size / 2.7,

                            fontWeight: 500,

                            color: theme.avatar.text,

                            bottom: borderColor ? 2 : 0,
                        }}
                    >
                        {content || name?.at(0) || (
                            <Icon
                                color={theme.avatar.text}
                                size={size / 1.6}
                                name="account-outline"
                            />
                        )}
                    </ThemedText>
                </View>
            </View>
            {canUpload && (
                <Badge>
                    <Icon
                        color={theme.avatar.badge.text}
                        size={24}
                        name="camera-outline"
                    />
                </Badge>
            )}
            {!canUpload && placement != null && (
                <Badge circular={false}>
                    <Text
                        style={{
                            fontSize: 20,
                            color: theme.avatar.badge.text,

                            fontWeight: 600,
                        }}
                    >
                        {isUnranked ? '--' : formatPlacement(placement)}
                    </Text>
                </Badge>
            )}
        </Pressable>
    );
}
