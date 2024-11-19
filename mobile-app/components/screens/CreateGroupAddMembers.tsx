import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HeaderItem } from '@/app/(tabs)/_layout';
import { theme } from '@/theme';
import { GroupMember } from '@/zustand/group/stateCreateGroupStore';

import Avatar from '../Avatar';
import TextInput from '../TextInput';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

export interface CreateGroupAddMembersProps {
    onSubmit: (members: GroupMember[]) => void;
}
export default function CreateGroupAddMembers({
    onSubmit,
}: CreateGroupAddMembersProps) {
    const [members, setMembers] = useState<GroupMember[]>([]);

    const inputRef = useRef(null);

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderItem onPress={() => onSubmit(members)}>
                            Next
                        </HeaderItem>
                    ),

                    headerTitle: 'Add Players',
                    headerBackTitle: '',
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
            <>
                <View
                    style={{
                        backgroundColor: 'black',
                        flex: 1,

                        padding: 16,
                    }}
                >
                    <TextInput
                        ref={inputRef}
                        required
                        placeholder="Group member name"
                        returnKeyType="done"
                        onSubmitEditing={(event) => {
                            const name = event.nativeEvent.text.trim();

                            if (name.length) {
                                setMembers((prev) => [...prev, { name }]);
                            }

                            // @ts-ignore
                            inputRef.current!.clear();

                            // TODO: we don't want to unfocus the element on submit, but it's still happening :()
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                    />
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
                        </View>
                    ))}
                </View>
            </>
        </GestureHandlerRootView>
    );
}
