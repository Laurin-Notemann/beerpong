import React from 'react';

import { TabStack } from '@/components/navigation/TabStack';

export const unstable_settings = { anchor: 'index' };

export default function Layout() {
    return <TabStack root="index" />;
}
