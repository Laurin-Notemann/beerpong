import React from 'react';

import { TabStack } from '@/components/navigation/TabStack';

export const unstable_settings = { anchor: 'newMatch' };

export default function Layout() {
    return <TabStack root="newMatch" />;
}
