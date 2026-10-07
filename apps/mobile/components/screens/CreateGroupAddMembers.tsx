import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import type { TextInputInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Avatar from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useAutoFocus } from '@/components/screens/useAutoFocus';
import Text from '@/components/Text';
import TextInput from '@/components/TextInput';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';
import { GroupMember } from '@/zustand/group/stateCreateGroupStore';

const MIN_GROUP_MEMBERS = 2;

export interface CreateGroupAddMembersProps {
    onSubmit: (members: GroupMember[]) => void;
}
export default function CreateGroupAddMembers({
    onSubmit,
}: CreateGroupAddMembersProps) {
    const [members, setMembers] = useState<GroupMember[]>([]);

    const [value, setValue] = useState('');

    const inputRef = useRef<TextInputInstance>(null);

    useAutoFocus(inputRef);

    const canBeCreated = members.length >= MIN_GROUP_MEMBERS;

    const existingPlayerName = members.find(
        (i) => i.name.toLowerCase() === value.toLowerCase()
    )?.name;

    const canSubmit = value.length > 0 && !existingPlayerName;

    function onAddMember() {
        if (canSubmit) {
            setMembers((prev) => [...prev, { name: value }]);

            setValue('');
            inputRef.current?.clear();
            triggerHapticBump('selection');
        }
    }
    function onRemoveMember(idx: number) {
        setMembers((prev) => prev.filter((_, index) => index !== idx));
        triggerHapticBump('selection');
    }
    const theme = useTheme();

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    // a group needs at least 2 players; count up to that, then just the title
                    headerTitle: canBeCreated
                        ? 'Add Players'
                        : `Add Players (${members.length} / 2)`,
                    headerBackVisible: true,
                    headerTintColor: theme.color.text.primary,

                    headerStyle: {
                        backgroundColor: theme.color.topNav,
                    },
                    headerTitleStyle: {
                        color: theme.color.text.primary,
                    },
                }}
            />
            <Stack.Toolbar placement="right">
                {value.length > 0 || members.length < 2 ? (
                    <Stack.Toolbar.Button
                        disabled={!canSubmit}
                        onPress={onAddMember}
                    >
                        Add
                    </Stack.Toolbar.Button>
                ) : (
                    <Stack.Toolbar.Button
                        disabled={!canBeCreated}
                        onPress={() => onSubmit(members)}
                    >
                        Next
                    </Stack.Toolbar.Button>
                )}
            </Stack.Toolbar>
            <View
                style={{
                    backgroundColor: theme.color.bg,
                    padding: 16,

                    flexDirection: 'row',
                }}
            >
                <TextInput
                    errorMessage={
                        existingPlayerName
                            ? `There's already a player named "${existingPlayerName}" in this group.`
                            : undefined
                    }
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
                    onChangeText={(text) => setValue(text.trim())}
                    onSubmitEditing={onAddMember}
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
                {members.length < 1 && value.length > 0 && (
                    <Text color="secondary" style={{ textAlign: 'center' }}>
                        Press enter to add player "{value}"
                    </Text>
                )}
                {members.map((i, idx) => (
                    <View
                        key={idx}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',

                            height: 60.5,
                            paddingHorizontal: 8,
                        }}
                    >
                        <Avatar name={i.name} size={36} />
                        <View
                            style={{
                                flex: 1,

                                marginLeft: 12,
                                marginRight: 8,
                            }}
                        >
                            <Text
                                numberOfLines={2}
                                style={{
                                    fontSize: 17,
                                    fontWeight: 500,
                                    color: theme.color.text.primary,
                                }}
                            >
                                {i.name}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => onRemoveMember(idx)}
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
