import { useNavigation } from 'expo-router';
import React from 'react';

import JoinGroup from '@/components/screens/JoinGroup';

export default function Page() {
    const navigation = useNavigation();

    // @ts-ignore
    return <JoinGroup onSubmit={(code) => navigation.navigate('index')} />;
}
