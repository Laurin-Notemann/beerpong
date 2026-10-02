import React from 'react';

import { TabStack } from '@/components/navigation/TabStack';

export const unstable_settings = { anchor: 'rules' };

export default function Layout() {
    return <TabStack root="rules" />;
}
