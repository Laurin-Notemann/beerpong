import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    TextInput as B,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HeaderItem } from '@/app/(tabs)/HeaderItem';
import { theme } from '@/theme';
import { GroupMember } from '@/zustand/group/stateCreateGroupStore';

import Avatar from '../Avatar';
import TextInput from '../TextInput';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

const MIN_GROUP_MEMBERS = 2;

export interface CreateGroupAddMembersProps {
    onSubmit: (members: GroupMember[]) => void;
}
export default function CreateGroupAddMembers({
    onSubmit,
}: CreateGroupAddMembersProps) {
    const [members, setMembers] = useState<GroupMember[]>([]);

    const inputRef = useRef<B>(null);

    const canBeCreated = members.length >= MIN_GROUP_MEMBERS;

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderItem
                            disabled={!canBeCreated}
                            onPress={() => onSubmit(members)}
                        >
                            Next
                        </HeaderItem>
                    ),

                    headerTitle: `Add Players (${members.length} / 2) ${canBeCreated ? '✅' : ''}`,
                    headerBackTitleVisible: false,
                    headerBackVisible: true,
                    headerTintColor: '#fff',

                    headerStyle: {
                        backgroundColor: '#000',
                    },
                    headerTitleStyle: {
                        color: theme.color.text.primary,
                    },
                }}
            />
            <View
                style={{
                    backgroundColor: theme.color.bg,
                    padding: 16,
                }}
            >
                <TextInput
                    autoFocus
                    autoCorrect={false}
                    ref={inputRef}
                    required
                    placeholder="Player name"
                    returnKeyType="default"
                    blurOnSubmit={false} // makes the cursor stay in the text field after submitting
                    onKeyPress={(e) => {
                        if (e.nativeEvent.key === 'Enter') {
                            e.preventDefault();
                        }
                    }}
                    onSubmitEditing={(event) => {
                        const name = event.nativeEvent.text.trim();

                        if (name.length) {
                            setMembers((prev) => [...prev, { name }]);
                        }

                        inputRef.current?.clear();
                    }}
                />
            </View>
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    gap: 8,
                }}
            >
                {members.map((i, idx) => (
                    <View
                        key={idx}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',

                            height: 60.5,
                            paddingHorizontal: 20,
                        }}
                    >
                        <Avatar name={i.name} size={36} />
                        <ThemedView
                            style={{
                                marginLeft: 12,
                            }}
                        >
                            <ThemedText
                                style={{
                                    fontSize: 17,
                                    fontWeight: 500,
                                    color: theme.color.text.primary,
                                }}
                            >
                                {i.name}
                            </ThemedText>
                        </ThemedView>
                        <TouchableOpacity
                            onPress={() =>
                                setMembers((prev) =>
                                    prev.filter((_, index) => index !== idx)
                                )
                            }
                            style={{ marginLeft: 'auto' }}
                        >
                            <Icon
                                name="delete-outline"
                                size={24}
                                color={theme.color.text.secondary}
                            />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </GestureHandlerRootView>
    );
}
