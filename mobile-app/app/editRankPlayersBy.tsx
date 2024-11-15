import { useState } from 'react';

import InputModal from '@/components/InputModal';
import Select from '@/components/Select';

export default function Page() {
    const [value, setValue] = useState('average');

    return (
        <InputModal>
            <Select
                items={[
                    {
                        value: 'average',
                        title: 'Average Points Scored',
                        subtitle: 'Points scored divided by matches played.',
                    },
                    {
                        value: 'elo',
                        title: 'Elo',
                        subtitle:
                            'More balanced algorithm based on relative skill level.',
                    },
                ]}
                value={value}
                onChange={setValue}
                footer="Learn more about the elo algorithm"
            />
        </InputModal>
    );
}
