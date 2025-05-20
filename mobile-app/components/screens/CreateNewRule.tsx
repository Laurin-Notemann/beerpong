import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';

export interface CreateNewRuleProps {
    onCreate: (rule: { title: string; description: string }) => void;
    existingRules?: { title: string; description: string }[];
    isPending: boolean;
}
export default function CreateNewRule({
    onCreate,
    existingRules,
    isPending,
}: CreateNewRuleProps) {
    const nav = useNavigation();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const existingValue = existingRules?.find(
        (i) => i.title.toLowerCase() === title.toLowerCase()
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Create new Rule',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
                    headerRight: () => (
                        <HeaderItem
                            disabled={
                                title.length < 1 ||
                                (existingValue?.title?.length ?? 0) > 0 ||
                                description.length < 1
                            }
                            isLoading={isPending}
                            onPress={() => onCreate({ title, description })}
                        >
                            Create
                        </HeaderItem>
                    ),
                }}
            />
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
                        flex: 1,

                        gap: 64,
                    }}
                >
                    <TextInput
                        errorMessage={
                            existingValue
                                ? `There\'s already a rule named "${existingValue}" in this group.`
                                : undefined
                        }
                        required
                        placeholder="Rule Title"
                        onChangeText={(text) => setTitle(text.trim())}
                        autoFocus
                        style={{
                            alignSelf: 'stretch',
                        }}
                    />
                    <TextInput
                        required
                        placeholder="Rule Description"
                        onChangeText={(text) => setDescription(text)}
                        value={description}
                        multiline
                        numberOfLines={10}
                        style={{
                            alignSelf: 'stretch',
                            marginTop: 8,

                            minHeight: 22 * 5,
                        }}
                    />
                </View>
            </InputModal>
        </>
    );
}
