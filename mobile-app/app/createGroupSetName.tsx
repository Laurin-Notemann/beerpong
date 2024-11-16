import { useNavigation } from 'expo-router';
import React from 'react';

import CreateGroupSetName from '@/components/screens/CreateGroupSetName';

export default function Page() {
    const nav = useNavigation();

    return (
        <CreateGroupSetName
            onSubmit={(group) => {
                // @ts-ignore
                nav.navigate('index');
            }}
        />
    );
}
