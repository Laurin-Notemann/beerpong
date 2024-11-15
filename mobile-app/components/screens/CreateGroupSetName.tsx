import React from 'react';
import { View } from 'react-native';

import TextInput from '../TextInput';

export interface CreateGroupSetNameProps {
    onSetName: (name: string) => void;
}
export default function CreateGroupSetName({
    onSetName,
}: CreateGroupSetNameProps) {
    return (
        <>
            <View
                style={{
                    height: 64,
                }}
            ></View>
            <View
                style={{
                    backgroundColor: 'black',
                    flex: 1,

                    padding: 16,
                }}
            >
                <TextInput
                    required
                    placeholder="Group name"
                    returnKeyType="done"
                    onSubmitEditing={(event) => {
                        onSetName(event.nativeEvent.text);
                    }}
                />
            </View>
        </>
    );
}
