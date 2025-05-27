import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
    NestableDraggableFlatList,
    NestableScrollContainer,
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useGroup } from '@/api/calls/seasonHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { AppBackground } from '@/app/Background';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import Button from '@/components/Button';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import { HeaderItem } from '@/components/HeaderItem';
import IconHead from '@/components/IconHead';
import { RefreshControl } from '@/components/RefreshControl';
import { Rule } from '@/components/Rules/Rule';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';
import { showSuccessToast } from '@/toast';

export type RuleRenderItem = {
    id: string;
    title: string;
    description: string;
};

export interface RulesProps {
    rules: RuleRenderItem[];
    onReorderRules: (rules: RuleRenderItem[]) => void;
    onDeleteRules: (ids: string[]) => void;
    onResetRules: () => void;
    onUpdateRule: (id: string, title: string, description: string) => void;
}
export default function Rules({
    rules,
    onReorderRules,
    onDeleteRules,
    onResetRules,
    onUpdateRule,
}: RulesProps) {
    const theme = useTheme();
    const [isEditing, setIsEditing] = useState(false);

    const [modalId, setModalId] = useState<string | null>(null);

    const modalItem = rules.find((i) => i.id === modalId);

    const nav = useNavigation();

    const insets = useInsets(true, true);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    function deleteSelectedRules() {
        onDeleteRules(selectedIds);
        showSuccessToast(
            `${selectedIds.length > 1 ? 'Rules' : 'Rule'} deleted.`
        );
        setSelectedIds([]);
    }

    const renderItem = ({
        item,
        drag,
        isActive,
    }: RenderItemParams<RuleRenderItem>) => {
        return (
            <Rule
                key={item.id}
                onLongPress={() => {
                    triggerHapticBump('selection');
                    nav.navigate('rule', { id: item.id });
                    // setModalId(item.id);
                }}
                active={isActive}
                editMode={isEditing}
                title={item.title}
                description={item.description}
                onDragToReorder={drag}
                onSelect={() => {
                    if (selectedIds.includes(item.id)) {
                        setSelectedIds((prev) =>
                            prev.filter((i) => i !== item.id)
                        );
                    } else {
                        setSelectedIds((prev) => [...prev, item.id]);
                    }
                }}
                selected={selectedIds.includes(item.id)}
            />
        );
    };
    const { groupId, seasonId } = useGroup();

    const { invalidateRules } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateRules(groupId!, seasonId!)
    );

    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    return (
        <GestureHandlerRootView>
            <AppBackground />
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => {
                                if (isEditing) {
                                    setSelectedIds([]);
                                }
                                setIsEditing((prev) => !prev);
                            }}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </HeaderItem>
                    ),
                    headerTitle:
                        selectedIds.length > 0
                            ? `${selectedIds.length} Selected`
                            : undefined,
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
                    // {
                    //     title: 'Edit Rule',
                    //     type: 'default',

                    //     onPress: () => {},
                    // },
                    {
                        title: 'Delete Rule',
                        type: 'danger',

                        onPress: () => {
                            onDeleteRules([modalId!]);
                            showSuccessToast('Rule deleted.');
                            setModalId(null);
                        },
                    },
                ]}
                isVisible={modalItem != null}
            />

            <ConfirmationModal
                onClose={() => setShowDeleteConfirmation(false)}
                title={selectedIds.length > 1 ? 'Delete Rules' : 'Delete Rule'}
                description={
                    selectedIds.length > 1
                        ? `Are you sure you want to delete ${selectedIds.length} rules?`
                        : 'Are you sure you want to delete this rule?'
                }
                actions={[
                    {
                        title: 'Delete',
                        type: 'danger',

                        onPress: () => {
                            deleteSelectedRules();
                            showSuccessToast(
                                selectedIds.length > 1
                                    ? 'Rules deleted.'
                                    : 'Rule deleted.'
                            );
                            setShowDeleteConfirmation(false);
                        },
                    },
                    {
                        title: 'Cancel',
                        type: 'default',

                        onPress: () => {
                            setShowDeleteConfirmation(false);
                        },
                    },
                ]}
                isVisible={showDeleteConfirmation}
            />

            <NestableScrollContainer
                refreshControl={<RefreshControl {...refresh} />}
                contentContainerStyle={{
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom,
                }}
            >
                <NestableDraggableFlatList
                    data={rules}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => {
                        onReorderRules(data);
                    }}
                    ListEmptyComponent={
                        <IconHead
                            iconName="format-section"
                            title="No Rules"
                            style={{ paddingTop: 128 }}
                            description={
                                <Button
                                    style={{
                                        marginTop: 24,
                                    }}
                                    onPress={onResetRules}
                                    title="Reset Rules"
                                    variant="primary"
                                />
                            }
                        />
                    }
                />
                {rules.length > 0 && (
                    <Text
                        style={{
                            fontSize: 12,
                            color: theme.color.text.secondary,
                            marginTop: 16,

                            marginBottom:
                                42 + 32 + (selectedIds.length > 0 ? 42 : 0),

                            paddingHorizontal: 16,
                            textAlign: 'center',
                        }}
                    >
                        The default ruleset is based on the house rules of the
                        student fraternity{' '}
                        <Text
                            style={{ fontWeight: 'bold', fontStyle: 'italic' }}
                        >
                            VDSt Straßburg-Hamburg-Rostock
                        </Text>
                        .
                    </Text>
                )}
            </NestableScrollContainer>
            {isEditing && (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        justifyContent: 'space-between',

                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        paddingBottom: insets.bottom + 16,
                        paddingHorizontal: 16,
                    }}
                >
                    {selectedIds.length > 0 && (
                        <>
                            <Button
                                title="Delete"
                                onPress={() => setShowDeleteConfirmation(true)}
                            />
                            {/* <Button
                                title="Copy to Group"
                                onPress={() => setShowDeleteConfirmation(true)}
                            /> */}
                        </>
                    )}
                    <Button
                        title="Add Rule"
                        onPress={() => nav.navigate('createNewRule')}
                        style={{
                            alignSelf: 'stretch',
                            marginLeft: 'auto',
                        }}
                    />
                </View>
            )}
        </GestureHandlerRootView>
    );
}
