import { useLocalSearchParams } from 'expo-router';

import { useRules } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import RulesSwiper from '@/components/screens/RulesSwiper';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const { rules, setRules, isMutationPending } = useRules();

    const { groupId, seasonId } = useGroup();

    async function onSubmit(rules: { title: string; description: string }[]) {
        if (!groupId || !seasonId) return;

        try {
            await setRules(
                rules.map((rule, idx) => ({ ...rule, id: idx.toString() }))
            );
            showSuccessToast(`Updated rules.`);
        } catch (err) {
            ConsoleLogger.error('failed to update rules:', err);
            showErrorToast('Failed to update rules.');
        }
    }

    return (
        <RulesSwiper
            rules={rules}
            initialId={id}
            onSubmit={onSubmit}
            isPending={isMutationPending}
        />
    );
}
