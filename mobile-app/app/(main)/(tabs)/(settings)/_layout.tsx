import React from 'react';

import { TabStack } from '@/components/navigation/TabStack';

export const unstable_settings = { anchor: 'settings' };

export default function Layout() {
    return <TabStack root="settings" />;
}
