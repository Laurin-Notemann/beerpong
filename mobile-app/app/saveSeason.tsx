import { useState } from 'react';

import InputModal from '@/components/InputModal';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';

export default function Page() {
    const [value, setValue] = useState('');

    return (
        <InputModal>
            <Podium detailed={false} />
            <TextInput
                required
                placeholder="Season Name"
                value={value}
                onChangeText={setValue}
                autoFocus
                style={{
                    alignSelf: 'stretch',
                }}
            />
        </InputModal>
    );
}
