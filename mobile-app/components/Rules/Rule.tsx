import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAnimatedSideActionStyle } from '@/components/Rules/useAnimatedSideActionStyle';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';

export interface RuleProps {
    title: string;
    description: string;

    active: boolean;
    editMode: boolean;

    onLongPress: () => void;
    onDragToReorder: () => void;

    selected?: boolean;
    onSelect: () => void;
}
/**
 * list element with a title.
 * - on tap, expands to show a description.
 * - on long press, shows a modal to edit the rule.
 * - if `editMode`, shows a drag icon to reorder the item within the list. the description gets collapsed.
 * - `active` is used for styling the item while it's being dragged.
 */
export const Rule: React.FC<RuleProps> = ({
    title,
    description,

    active,
    editMode,

    onLongPress,
    onDragToReorder,

    onSelect,
    selected = false,
}) => {
    // used to measure the height of the text for the collapse / expand animation
    const descriptionTextRef = useRef<Text>(null);

    const [descriptionTextHeight, setDescriptionTextHeight] = useState(0);

    const [isExpanded, setIsExpanded] = useState(false);

    // height of the description container
    const descriptionContainerHeight = useSharedValue(0);

    const animatedHeight = useAnimatedStyle(() => ({
        height: editMode ? 0 : descriptionContainerHeight.value,
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

    const selectIconStyle = useAnimatedSideActionStyle(editMode);

    const theme = useTheme();

    const styles = useMemo(
        () =>
            StyleSheet.create({
                rowItem: {
                    flexDirection: 'row',
                    alignItems: 'center',

                    height: 50,

                    paddingLeft: 12,
                },
                text: {
                    color: theme.color.text.primary,
                    fontSize: 16,

                    flex: 1,
                },
            }),
        [theme]
    );

    return (
        <>
            <Pressable
                onPress={editMode ? onSelect : toggleCollapse}
                onLongPress={onLongPress}
                style={[
                    styles.rowItem,
                    {
                        backgroundColor: active
                            ? theme.panel.dark.active
                            : selected
                              ? 'rgba(255, 255, 255, 0.08)'
                              : undefined,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        selectIconStyle,
                        {
                            justifyContent: 'center',

                            height: '100%',
                        },
                    ]}
                >
                    <Icon
                        name={selected ? 'check-circle' : 'circle-outline'}
                        size={24}
                        color={
                            selected ? theme.icon.primary : theme.icon.secondary
                        }
                        style={{
                            marginLeft: 12,
                        }}
                    />
                </Animated.View>
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
                {editMode && (
                    <Pressable onPressIn={onDragToReorder}>
                        <View
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
                        </View>
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
                onLayout={() => {
                    descriptionTextRef.current?.measure(
                        (x, y, width, height) => {
                            setDescriptionTextHeight(height);
                        }
                    );
                }}
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
