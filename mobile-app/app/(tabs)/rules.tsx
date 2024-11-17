import React, { useState } from 'react';

import { mockRules } from '@/components/mockData/rules';
import Rules from '@/components/screens/Rules';

export default function Page() {
    const [rules, setRules] = useState(mockRules);

    return <Rules rules={rules} setRules={setRules} />;
}
