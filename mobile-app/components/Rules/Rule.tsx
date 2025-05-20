import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { triggerHapticBump } from '@/haptics';
import { theme } from '@/theme';

export interface RuleProps {
    title: string;
    description: string;

    active: boolean;
    draggable: boolean;

    onLongPress: () => void;
    onDragToReorder: () => void;
    onDelete: () => void;
}
/**
 * list element with a title.
 * - on tap, expands to show a description.
 * - on long press, shows a modal to edit the rule.
 * - if `draggable`, shows a drag icon to reorder the item within the list. the description gets collapsed.
 * - `active` is used for styling the item while it's being dragged.
 */
export const Rule: React.FC<RuleProps> = ({
    title,
    description,

    active,
    draggable,

    onLongPress,
    onDragToReorder,
    onDelete,
}) => {
    // used to measure the height of the text for the collapse / expand animation
    const descriptionTextRef = useRef<Text>(null);

    const [descriptionTextHeight, setDescriptionTextHeight] = useState(0);

    useEffect(() => {
        // timeout of 0ms to ensure the ref has rendered once before measuring
        setTimeout(() => {
            descriptionTextRef.current?.measure((x, y, width, height) => {
                setDescriptionTextHeight(height);
            });
        }, 0);
    }, [descriptionTextRef]);

    const [isExpanded, setIsExpanded] = useState(false);

    // height of the description container
    const descriptionContainerHeight = useSharedValue(0);

    const animatedHeight = useAnimatedStyle(() => ({
        height: descriptionContainerHeight.value,
    }));

    const toggleCollapse = () => {
        triggerHapticBump('selection');
        setIsExpanded((prev) => {
            const next = !prev;

            const height = next ? descriptionTextHeight : 0;

            descriptionContainerHeight.value = withTiming(height, {
                duration: 100,
            });
            return next;
        });
    };

    // width of the square around the delete button that slides out when the sidebar is in edit mode
    const deleteActionWidth = useSharedValue(draggable ? 40 : 0);

    useEffect(() => {
        deleteActionWidth.value = withTiming(draggable ? 40 : 0, {
            duration: 150,
        });
    }, [draggable]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: deleteActionWidth.value,
    }));

    return (
        <>
            <Pressable
                onPress={toggleCollapse}
                onLongPress={onLongPress}
                style={[
                    styles.rowItem,
                    {
                        backgroundColor: active
                            ? theme.panel.dark.active
                            : undefined,
                    },
                ]}
            >
                <Pressable onPress={onDelete}>
                    <Animated.View
                        style={[
                            animatedStyle,
                            {
                                justifyContent: 'center',

                                height: '100%',
                            },
                        ]}
                    >
                        <Icon
                            name="minus-circle"
                            size={24}
                            color="#f55"
                            style={{
                                marginLeft: 12,
                            }}
                        />
                    </Animated.View>
                </Pressable>
                <Icon
                    name="format-section"
                    size={24}
                    color={theme.color.text.primary}
                    style={{
                        marginRight: 8,
                    }}
                />
                <Text style={styles.text} numberOfLines={1}>
                    {title}
                </Text>
                {draggable && (
                    <Pressable
                        onPressIn={onDragToReorder}
                        style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            aspectRatio: 1,
                            marginLeft: 'auto',
                        }}
                    >
                        <Icon
                            name="drag-horizontal-variant"
                            size={24}
                            color={theme.color.text.primary}
                        />
                    </Pressable>
                )}
            </Pressable>
            <Animated.View
                style={[
                    animatedHeight,
                    {
                        overflow: 'hidden',
                        paddingLeft: 24,
                        paddingRight: 16,

                        backgroundColor: active
                            ? theme.panel.dark.active
                            : undefined,
                    },
                ]}
            >
                {/* Render description only if expanded or height > 0 for accessibility */}
                {(isExpanded || descriptionContainerHeight.value > 0) && (
                    <Text
                        style={{
                            fontSize: 16,
                            lineHeight: 22,
                            color: theme.color.text.secondary,

                            paddingBottom: 8,
                        }}
                    >
                        {description}
                    </Text>
                )}
            </Animated.View>
            {/* this is not actually rendered, we only use it to measure the height that the description text takes up */}
            <Text
                ref={descriptionTextRef}
                style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    opacity: 0,

                    paddingLeft: 24,
                    paddingRight: 16,

                    fontSize: 16,
                    lineHeight: 22,
                    color: theme.color.text.secondary,

                    paddingBottom: 8,
                }}
            >
                {description}
            </Text>
        </>
    );
};

const styles = StyleSheet.create({
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',

        height: 50,
        paddingLeft: 16,
    },
    text: {
        color: theme.color.text.primary,
        fontSize: 16,

        flex: 1,
    },
});
