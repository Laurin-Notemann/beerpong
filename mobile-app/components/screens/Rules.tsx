import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import {
    NestableDraggableFlatList,
    NestableScrollContainer,
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HeaderItem } from '@/app/(tabs)/HeaderItem';
import ConfirmationModal from '@/components/ConfirmationModal';
import IconHead from '@/components/IconHead';
import { theme } from '@/theme';

export type RuleRenderItem = {
    id: string;
    title: string;
    description: string;
};

function Rule({
    onLongPress,
    active,
    draggable,
    title,
    description,
    drag,
}: {
    onLongPress: () => void;
    active: boolean;
    draggable: boolean;
    title: string;
    description: string;
    drag: () => void;
}) {
    const animation = useRef(new Animated.Value(0)).current; // start with height 0

    const [isExpanded, setIsExpanded] = useState(false);

    const heightValue = useSharedValue(0);
    // React.Ref<View | Animated.LegacyRef<View>>
    const containerRef = useRef<any>(null);

    useEffect(() => {
        // Measure the container to get its auto height
        if (containerRef.current) {
            // containerRef.current.measure((x, y, width, height, pageX, pageY) => {
            //   heightValue.value = height; // Set the initial height when expanded
            // });
            // heightValue.value = 80;
        }
    }, []);

    const toggleCollapse = () => {
        // Animate the height when toggling
        // Animated.timing(animation, {
        //   toValue: isExpanded ? 0 : 1, // expand or collapse
        //   duration: 300, // animation duration in ms
        //   useNativeDriver: false, // we animate height, which cannot use native driver
        // }).start();

        setIsExpanded(!isExpanded);
    };

    // Interpolate the animated value to control height
    const contentHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 44 * 8], // customize the height range based on your content
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            // height: withSpring(isExpanded ? heightValue.value : 0, { duration: 300 }),
        };
    });

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
                <Icon
                    name="format-section"
                    size={24}
                    color={theme.color.text.primary}
                    style={{
                        marginRight: 8,
                    }}
                />
                <Text style={styles.text}>{title}</Text>
                {draggable && (
                    <Pressable
                        onPressIn={drag}
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
            {isExpanded && (
                <Animated.View
                    ref={containerRef}
                    style={[
                        animatedStyle,
                        {
                            overflow: 'hidden',

                            paddingLeft: 24,
                            paddingRight: 16,
                            paddingBottom: 8,
                        },
                    ]}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            lineHeight: 22,

                            color: theme.color.text.secondary,
                            backgroundColor: active
                                ? theme.panel.dark.active
                                : undefined,
                        }}
                    >
                        {description}
                    </Text>
                </Animated.View>
            )}
        </>
    );
}

export interface RulesProps {
    rules: RuleRenderItem[];
    setRules: (data: RuleRenderItem[]) => void;
}
export default function Rules({ rules, setRules }: RulesProps) {
    const [isEditing, setIsEditing] = useState(false);

    const [modalId, setModalId] = useState<string | null>(null);

    const modalItem = rules.find((i) => i.id === modalId);

    const renderItem = ({
        item,
        drag,
        isActive,
    }: RenderItemParams<RuleRenderItem>) => {
        return (
            <Rule
                onLongPress={() => setModalId(item.id)}
                active={isActive}
                draggable={isEditing}
                title={item.title}
                description={item.description}
                drag={drag}
            />
        );
    };

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => {
                                setIsEditing((prev) => !prev);
                            }}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </HeaderItem>
                    ),
                }}
            />

            <ConfirmationModal
                onClose={() => setModalId(null)}
                title={modalItem?.title!}
                description={modalItem?.description!}
                actions={[
                    {
                        title: 'Copy Rule',
                        type: 'default',

                        onPress: () => {},
                    },
                    {
                        title: 'Edit Rule',
                        type: 'default',

                        onPress: () => {},
                    },
                    {
                        title: 'Delete Rule',
                        type: 'danger',

                        onPress: () => {},
                    },
                ]}
                isVisible={modalItem != null}
            />

            <NestableScrollContainer
                style={{
                    backgroundColor: theme.color.bg,
                }}
            >
                <Text
                    style={{
                        color: theme.color.text.primary,
                        fontSize: 14,
                        paddingHorizontal: 16,
                    }}
                >
                    Rules
                </Text>
                <NestableDraggableFlatList
                    data={rules}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => setRules(data)}
                    ListEmptyComponent={
                        <IconHead iconName="format-section" title="No Rules" />
                    }
                />
                <Text
                    style={{
                        color: '#777',
                        fontWeight: 700,
                        fontSize: 14,
                        paddingHorizontal: 8,
                    }}
                >
                    Moves
                </Text>
                <NestableDraggableFlatList
                    data={rules}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => setRules(data)}
                    ListEmptyComponent={
                        <IconHead iconName="format-section" title="No Moves" />
                    }
                />
            </NestableScrollContainer>

            {/* <DraggableFlatList
        style={{
          backgroundColor: theme.color.bg,
        }}
        data={data}
        onDragEnd={({ data }) => setRules(data)}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
      />
      <DraggableFlatList
        style={{
          backgroundColor: theme.color.bg,
        }}
        data={data}
        onDragEnd={({ data }) => setRules(data)}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
      /> */}
        </GestureHandlerRootView>
    );
}

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
    },
});
