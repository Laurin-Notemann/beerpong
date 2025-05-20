import React from 'react';

import { useRules } from '@/api/calls/ruleHooks';
import Rules from '@/components/screens/Rules';

export default function Page() {
    const { rules, reorderRules, deleteRules, setDefaultRules, updateRule } =
        useRules();

    return (
        <Rules
            rules={rules}
            onReorderRules={reorderRules}
            onDeleteRules={deleteRules}
            onResetRules={setDefaultRules}
            onUpdateRule={updateRule}
        />
    );
}
