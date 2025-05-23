import { useRules } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import CreateNewRule from '@/components/screens/CreateNewRule';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { createRulesMutation } = useRules();

    async function onSubmit(rule: { title: string; description: string }) {
        if (!groupId || !seasonId) return;

        try {
            await createRulesMutation.mutateAsync([rule]);

            showSuccessToast(`Created rule "${rule.title}".`);
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to create rule:', err);
            showErrorToast('Failed to create rule.');
        }
    }

    return (
        <CreateNewRule
            onCreate={onSubmit}
            existingRules={[]}
            isPending={createRulesMutation.isPending}
        />
    );
}
