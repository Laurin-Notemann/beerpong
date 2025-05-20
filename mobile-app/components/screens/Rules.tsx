import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import {
    NestableDraggableFlatList,
    NestableScrollContainer,
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavigation } from '@/app/navigation/useNavigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { HeaderItem } from '@/components/HeaderItem';
import IconHead from '@/components/IconHead';
import { Rule } from '@/components/Rules/Rule';
import { theme } from '@/theme';
import { showSuccessToast } from '@/toast';

import Button from '../Button';
import copyToClipboard from '../copyToClipboard';

export type RuleRenderItem = {
    id: string;
    title: string;
    description: string;
};

export interface RulesProps {
    rules: RuleRenderItem[];
    setRules: (data: RuleRenderItem[]) => void;
}
export default function Rules({ rules, setRules }: RulesProps) {
    const [isEditing, setIsEditing] = useState(false);

    const [modalId, setModalId] = useState<string | null>(null);

    const modalItem = rules.find((i) => i.id === modalId);

    const nav = useNavigation();

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
                onDragToReorder={drag}
                onDelete={() => {}}
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

                        onPress: () => {
                            copyToClipboard(modalItem?.description!);
                            setModalId(null);
                        },
                    },
                    {
                        title: 'Edit Rule',
                        type: 'default',

                        onPress: () => {},
                    },
                    {
                        title: 'Delete Rule',
                        type: 'danger',

                        onPress: () => {
                            setRules(
                                rules.filter((i) => i.id !== modalItem?.id)
                            );
                            showSuccessToast('Rule deleted.');
                            setModalId(null);
                        },
                    },
                ]}
                isVisible={modalItem != null}
            />

            <NestableScrollContainer
                style={{
                    backgroundColor: theme.color.bg,
                }}
            >
                {/* <Text
                    style={{
                        color: theme.color.text.primary,
                        fontSize: 14,
                        paddingHorizontal: 16,
                    }}
                >
                    Rules
                </Text> */}
                <NestableDraggableFlatList
                    data={rules}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => setRules(data)}
                    ListEmptyComponent={
                        <IconHead iconName="format-section" title="No Rules" />
                    }
                />
                {/* <Text
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
                /> */}
            </NestableScrollContainer>
            <View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    paddingBottom: 16,

                    width: 16 * 8,
                }}
            >
                <Button
                    title="Add Rule"
                    onPress={() => nav.navigate('createNewRule')}
                />
            </View>
        </GestureHandlerRootView>
    );
}
