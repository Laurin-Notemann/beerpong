import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useGroup } from '@/api/calls/seasonHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import Button from '@/components/Button';
import IconHead from '@/components/IconHead';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import { RefreshControl } from '@/components/RefreshControl';
import { Rule } from '@/components/Rules/Rule';
import { triggerHapticBump } from '@/haptics';
import { AppBackground } from '@/lib/Background';
import {
    NestableDraggableFlatList,
    NestableScrollContainer,
    RenderItemParams,
} from '@/lib/draggableFlatList';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
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
}: RulesProps) {
    const theme = useTheme();
    const [isEditing, setIsEditing] = useState(false);

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
                    triggerHapticBump('selection');
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

    const confirmDeleteSelected = () => {
        const many = selectedIds.length > 1;
        Alert.alert(
            many ? 'Delete Rules' : 'Delete Rule',
            many
                ? `Are you sure you want to delete ${selectedIds.length} rules?`
                : 'Are you sure you want to delete this rule?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteSelectedRules();
                        showSuccessToast(
                            many ? 'Rules deleted.' : 'Rule deleted.'
                        );
                    },
                },
            ]
        );
    };

    return (
        <GestureHandlerRootView>
            <AppBackground />
            <Stack.Screen
                options={{
                    headerTitle:
                        selectedIds.length > 0
                            ? `${selectedIds.length} Selected`
                            : undefined,
                }}
            />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant={isEditing ? 'done' : 'plain'}
                    onPress={() => {
                        if (isEditing) {
                            setSelectedIds([]);
                        }
                        setIsEditing((prev) => !prev);
                    }}
                >
                    {isEditing ? 'Done' : 'Edit'}
                </Stack.Toolbar.Button>
            </Stack.Toolbar>

            <View style={{ flex: 1 }}>
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
                            triggerHapticBump('selection');
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
                            The default ruleset is based on the house rules of
                            the student fraternity{' '}
                            <Text
                                style={{
                                    fontWeight: 'bold',
                                    fontStyle: 'italic',
                                }}
                            >
                                VDSt Straßburg-Hamburg-Rostock
                            </Text>
                            .
                        </Text>
                    )}
                </NestableScrollContainer>
            </View>

            {isEditing && (
                <View
                    style={{
                        flexDirection: 'row-reverse',
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
                    <OverlayTextButton
                        onPress={() => nav.navigate('createNewRule')}
                        title="Add Rule"
                    />

                    {selectedIds.length > 0 && (
                        <>
                            <OverlayTextButton
                                onPress={confirmDeleteSelected}
                                title="Delete"
                            />
                            {/* <OverlayTextButton
                                onPress={confirmDeleteSelected}
                                title="Copy to Group"
                            /> */}
                        </>
                    )}
                </View>
            )}
        </GestureHandlerRootView>
    );
}
