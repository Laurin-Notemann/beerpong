import { PropsWithChildren } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/theme';
import { formatPlacement } from '@/utils/format';

function Badge({ children }: PropsWithChildren) {
    return (
        <View
            style={{
                position: 'absolute',

                right: 0,
                bottom: 0,

                width: 32,
                height: 32,

                alignItems: 'center',
                justifyContent: 'center',

                backgroundColor: theme.avatar.badge.bg,

                borderRadius: 99,

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
    size?: 128 | 96 | 40 | 36;

    style?: any;

    borderColor?: string;

    canUpload?: boolean;
    placement?: number;

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

    onPress,
}: AvatarProps) {
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
                    alignItems: 'center',
                    justifyContent: 'center',

                    width: size,
                    height: size,

                    borderRadius: 99,

                    backgroundColor: theme.avatar.bg,

                    borderWidth: borderColor ? 2 : undefined,
                    borderColor,
                }}
            >
                {url ? (
                    <Image
                        source={{ uri: url }}
                        style={{
                            width: size,
                            height: size,
                            borderRadius: 99,
                        }}
                        resizeMode="cover"
                    />
                ) : (
                    <ThemedText
                        style={{
                            lineHeight: size,
                            fontSize: size / 2.7,

                            fontWeight: 500,

                            color: theme.avatar.text,

                            bottom: borderColor ? 2 : 0,
                        }}
                    >
                        {content || name?.[0] || (
                            <Icon
                                color={theme.avatar.text}
                                size={size / 1.6}
                                name="account-outline"
                            />
                        )}
                    </ThemedText>
                )}
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
            {!canUpload && placement && (
                <Badge>
                    <Text
                        style={{
                            fontSize: 26,
                            color: theme.avatar.badge.text,

                            fontWeight: 600,
                        }}
                    >
                        {formatPlacement(placement)}
                    </Text>
                </Badge>
            )}
        </Pressable>
    );
}
