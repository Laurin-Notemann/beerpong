import { useState } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';

import Avatar from '@/components/Avatar';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';

export interface CreateNewPlayerProps {
    onCreate: (player: { name: string }) => void;
}
export default function CreateNewPlayer({ onCreate }: CreateNewPlayerProps) {
    const [name, setName] = useState('');

    return (
        <InputModal>
            <Avatar
                name={name}
                size={96}
                canUpload
                onPress={async () => {
                    const result = await launchImageLibrary({
                        mediaType: 'photo',
                    });
                    // eslint-disable-next-line
                    console.log(result);
                }}
            />
            <TextInput
                required
                placeholder="Player Name"
                onChangeText={setName}
                autoFocus
                style={{
                    alignSelf: 'stretch',
                }}
            />
        </InputModal>
    );
}
