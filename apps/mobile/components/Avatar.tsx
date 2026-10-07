import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { memo, PropsWithChildren } from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import type { Placement } from '@/constants/rankingAlgorithms';
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
    size?: number;

    style?: ViewStyle;

    borderColor?: string;

    canUpload?: boolean;
    placement?: Placement;
    isUnranked?: boolean;

    variant?: 'default' | 'list';

    onPress?: () => void;
}
function Avatar({
    url,
    name,
    content,
    size = 36,
    style = {},
    borderColor,
    canUpload = false,
    placement,
    isUnranked = false,

    variant = 'default',

    onPress,
}: AvatarProps) {
    const theme = useTheme();

    const containerStyle: ViewStyle = { width: size, height: size, ...style };

    const avatar = (
        <>
            <View
                style={{
                    borderRadius: borderRadius,
                    overflow: 'hidden',
                }}
            >
                {(theme.blur?.intensity ?? 0) !== 0 && variant !== 'list' && (
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

                        backgroundColor: theme.blur?.intensity
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
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            // iOS: decodes at the avatar's size off the main thread. A large cached
                            // avatar was otherwise shrunk on the main thread on every reload (a
                            // recycled row), which hung the app (MOBILE-P).
                            enforceEarlyResizing
                            // list rows are recycled; without this a reused row flashes the previous avatar
                            recyclingKey={url}
                            transition={variant === 'list' ? 0 : 100}
                        />
                    )}
                    {(!url || content) && (
                        <Text
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
                        </Text>
                    )}
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
        </>
    );

    return onPress ? (
        <Pressable style={containerStyle} onPress={onPress}>
            {avatar}
        </Pressable>
    ) : (
        <View style={containerStyle}>{avatar}</View>
    );
}
export default memo(Avatar, (prev, next) => {
    // Intentionally ignore onPress identity to improve list perf
    return (
        prev.url === next.url &&
        prev.name === next.name &&
        prev.content === next.content &&
        prev.size === next.size &&
        prev.borderColor === next.borderColor &&
        prev.canUpload === next.canUpload &&
        prev.placement?.rank === next.placement?.rank &&
        prev.placement?.tied === next.placement?.tied &&
        prev.isUnranked === next.isUnranked &&
        prev.variant === next.variant
    );
});
