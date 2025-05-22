import { Stack, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Button from '@/components/Button';
import copyToClipboard from '@/components/copyToClipboard';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { Swiper, useSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';
import { useEditRulesStore } from '@/zustand/editRulesStore';

export interface EditRuleProps {
    rules: { id: string; title: string; description: string }[];
    initialId?: string;
    onSubmit: (
        rules: { title: string; description: string }[]
    ) => Promise<void>;
    isPending: boolean;
}

export default function RulesSwiper({
    rules,
    initialId,
    onSubmit,
    isPending,
}: EditRuleProps) {
    const nav = useNavigation();

    const [isEditing, setIsEditing] = useState(false);

    const swiper = useSwiper({
        initialPage: rules.findIndex((i) => i.id === initialId),
    });

    const editRulesStore = useEditRulesStore();

    useEffect(() => {
        editRulesStore.actions.initialize(rules);
    }, [rules]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Rules',
                    headerLeft: () =>
                        isEditing ? (
                            <HeaderItem onPress={() => setIsEditing(false)}>
                                Cancel
                            </HeaderItem>
                        ) : (
                            <HeaderItem onPress={() => nav.goBack()}>
                                Close
                            </HeaderItem>
                        ),
                    headerRight: () => (
                        <HeaderItem
                            isLoading={isPending}
                            onPress={async () => {
                                if (!isEditing) {
                                    setIsEditing(true);
                                } else {
                                    // store gets automatically reset when the `rules` props changes, triggering the `useEffect` in this file
                                    await onSubmit(editRulesStore.rules);

                                    setIsEditing(false);
                                }
                            }}
                            disabled={isEditing && !editRulesStore.isDirty}
                        >
                            {isEditing ? 'Save' : 'Edit'}
                        </HeaderItem>
                    ),
                }}
            />
            <Swiper
                {...swiper}
                style={{ backgroundColor: theme.panel.dark.bg }}
            >
                {editRulesStore.rules.map((rule) => {
                    return (
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: 32 }}
                            key={rule.id}
                        >
                            <InputModal>
                                <Icon
                                    name="format-section"
                                    size={64}
                                    color={theme.color.text.primary}
                                    style={{
                                        marginHorizontal: 'auto',
                                    }}
                                />
                                <View
                                    style={{
                                        gap: 16,
                                    }}
                                >
                                    {isEditing && (
                                        <>
                                            <TextInput
                                                defaultValue={rule.title}
                                                required
                                                placeholder="Rule Title"
                                                onChangeText={(text) => {
                                                    editRulesStore.actions.setRuleTitle(
                                                        rule.id,
                                                        text.trim()
                                                    );
                                                }}
                                                style={{
                                                    alignSelf: 'stretch',
                                                }}
                                            />
                                            <TextInput
                                                defaultValue={rule.description}
                                                required
                                                placeholder="Rule Description"
                                                onChangeText={(text) => {
                                                    editRulesStore.actions.setRuleDescription(
                                                        rule.id,
                                                        text
                                                    );
                                                }}
                                                multiline
                                                numberOfLines={10}
                                                style={{
                                                    alignSelf: 'stretch',
                                                    marginTop: 8,

                                                    minHeight: 22 * 20,

                                                    flex: 1,
                                                }}
                                            />
                                            <MenuSection>
                                                <MenuItem
                                                    title="Delete Rule"
                                                    headIcon="delete-outline"
                                                    onPress={() => {
                                                        editRulesStore.actions.deleteRule(
                                                            rule.id
                                                        );
                                                    }}
                                                    type="danger"
                                                    confirmationPrompt={{
                                                        title: 'Delete Rule',
                                                        description:
                                                            'Are you sure you want to delete this rule?',
                                                    }}
                                                />
                                            </MenuSection>
                                        </>
                                    )}
                                    {!isEditing && (
                                        <>
                                            <Text
                                                color="primary"
                                                style={{
                                                    fontSize: 25,

                                                    marginBottom: 16,

                                                    textAlign: 'center',
                                                }}
                                            >
                                                {rule.title}
                                            </Text>
                                            <Text
                                                color="secondary"
                                                style={{
                                                    paddingHorizontal: 16,

                                                    lineHeight: 22,
                                                }}
                                            >
                                                {rule.description}
                                            </Text>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent:
                                                        'space-between',
                                                }}
                                            >
                                                <Button
                                                    title="Copy to Clipboard"
                                                    onPress={() =>
                                                        copyToClipboard(
                                                            rule.description
                                                        )
                                                    }
                                                />
                                                <Button
                                                    title="Copy to Group"
                                                    onPress={() => {}}
                                                />
                                            </View>
                                        </>
                                    )}
                                </View>
                            </InputModal>
                        </ScrollView>
                    );
                })}
            </Swiper>
        </>
    );
}
