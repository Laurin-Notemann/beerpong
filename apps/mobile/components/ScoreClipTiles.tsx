import { Image } from 'expo-image';
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { Icon } from '@/components/Icon';
import Text from '@/components/Text';
import { useScoreClipThumbnail } from '@/lib/useScoreClipThumbnail';
import { useTheme } from '@/theme';

const TILE_WIDTH = 84;
/** portrait, like phones film */
const TILE_HEIGHT = (TILE_WIDTH * 16) / 9;
const TILE_RADIUS = 12;

/**
 * A player's score clips as a row of tiles showing each clip's first frame, then a tile that adds
 * one (missing when `onAddPress` is). Sits inside a MenuSection on the player's edit page.
 */
export function ScoreClipTiles({
    clips,
    isUploading,
    disabled,
    onClipPress,
    onAddPress,
}: {
    clips: string[];
    isUploading: boolean;
    disabled: boolean;
    onClipPress: (index: number) => void;
    onAddPress?: () => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, gap: 8 }}
        >
            {clips.map((url, index) => (
                <ClipTile
                    key={url}
                    url={url}
                    label={`Play score clip ${index + 1}`}
                    onPress={() => onClipPress(index)}
                />
            ))}
            {onAddPress && (
                <AddTile
                    isUploading={isUploading}
                    disabled={disabled}
                    onPress={onAddPress}
                />
            )}
        </ScrollView>
    );
}

function ClipTile({
    url,
    label,
    onPress,
}: {
    url: string;
    label: string;
    onPress: () => void;
}) {
    const theme = useTheme();
    const thumbnail = useScoreClipThumbnail(url);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                width: TILE_WIDTH,
                height: TILE_HEIGHT,
                borderRadius: TILE_RADIUS,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.panel.dark.bg,
                opacity: pressed ? 0.7 : 1,
            })}
        >
            {thumbnail ? (
                <Image
                    source={thumbnail}
                    contentFit="cover"
                    transition={150}
                    style={StyleSheet.absoluteFill}
                />
            ) : thumbnail === undefined ? (
                <ActivityIndicator style={{ position: 'absolute' }} />
            ) : null}
            {thumbnail !== undefined && (
                <View
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    }}
                >
                    <Icon name="play" size={20} color="white" />
                </View>
            )}
        </Pressable>
    );
}

function AddTile({
    isUploading,
    disabled,
    onPress,
}: {
    isUploading: boolean;
    disabled: boolean;
    onPress: () => void;
}) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Add score clip"
            style={({ pressed }) => ({
                width: TILE_WIDTH,
                height: TILE_HEIGHT,
                borderRadius: TILE_RADIUS,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.icon.secondary,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: pressed ? theme.panel.light.active : undefined,
                opacity: disabled && !isUploading ? 0.5 : 1,
            })}
        >
            {isUploading ? (
                <ActivityIndicator />
            ) : (
                <Icon name="plus" size={28} color={theme.icon.primary} />
            )}
            <Text variant="fineprint" color="secondary">
                {isUploading ? 'Uploading' : 'Add'}
            </Text>
        </Pressable>
    );
}
