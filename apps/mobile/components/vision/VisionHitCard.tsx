import { MenuView } from '@expo/ui/community/menu';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useVisionFeedback, visionConflict } from '@/api/calls/visionHitHooks';
import { useNextTokens } from '@/components/next/tokens';
import PressableScale from '@/components/PressableScale';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { VisionHitDto, VisionHitFeedbackDto } from '@/openapi/openapi';

export function VisionButton({
    title,
    onPress,
    disabled = false,
}: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    const t = useNextTokens();
    return (
        <PressableScale
            accessibilityRole="button"
            accessibilityLabel={title}
            disabled={disabled}
            pressedScale={0.96}
            onPress={onPress}
            style={{
                minHeight: 44,
                minWidth: 44,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: t.surfacePressed,
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>
                {title}
            </Text>
        </PressableScale>
    );
}

/** Recognition feedback is deliberately separate from the cup scoring actions. */
export function VisionHitCard({
    hit,
    review = false,
    showReplay = true,
}: {
    hit: VisionHitDto;
    review?: boolean;
    showReplay?: boolean;
}) {
    const t = useNextTokens();
    const nav = useNavigation();
    const feedback = useVisionFeedback(hit.groupId);
    const [error, setError] = useState<string | null>(null);
    const [retryChoice, setRetryChoice] = useState<
        Parameters<typeof feedback.mutateAsync>[0] | null
    >(null);
    const [conflictRevision, setConflictRevision] = useState<number | null>(
        null
    );
    const reconciling =
        conflictRevision !== null && hit.revision <= conflictRevision;
    async function save(choice: Parameters<typeof feedback.mutateAsync>[0]) {
        if (feedback.isPending || reconciling) return;
        setError(null);
        setRetryChoice(null);
        setConflictRevision(null);
        try {
            await feedback.mutateAsync(choice);
        } catch (err) {
            const conflict = visionConflict(err);
            setError(
                conflict
                    ? 'Someone reviewed this already. Refreshing their choice — check it before trying again.'
                    : "Couldn't save your choice. Try again when you're online."
            );
            if (conflict) setConflictRevision(choice.hit.revision);
            else setRetryChoice(choice);
        }
    }
    function label(value: VisionHitFeedbackDto['label']) {
        // A new decision uses the displayed revision; a retry keeps its original CAS.
        return save({
            hit,
            label: value,
            source: review ? 'human-review' : 'player',
        });
    }
    const source =
        hit.feedbackSource === 'human-review'
            ? 'Human review'
            : hit.feedbackSource === 'player'
              ? 'Player review'
              : hit.feedbackSource === 'ai-review'
                ? 'AI review'
                : 'Not reviewed';
    return (
        <View
            style={{
                padding: 12,
                gap: 6,
                borderRadius: t.radius,
                backgroundColor: t.surface,
            }}
        >
            <Text style={{ color: t.text, fontWeight: '600', fontSize: 15 }}>
                {review ? 'Camera suggestion' : 'Camera suggested hit'} ·{' '}
                {hit.team === 'red' ? 'Red' : 'Blue'} cups
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                {hit.cup
                    ? `Cup ${hit.cup.x + 1}, ${hit.cup.y + 1}`
                    : 'Cup position unclear'}{' '}
                ·{' '}
                {review
                    ? new Date(hit.occurredAt).toLocaleString()
                    : 'Experimental'}
                {review
                    ? ` · ${hit.label} · ${source}`
                    : ' · Score stays unchanged'}
            </Text>
            {review && (
                <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                    {hit.model}
                    {hit.reviewedAt
                        ? ` · Reviewed ${new Date(hit.reviewedAt).toLocaleString()}`
                        : ''}
                    {hit.reviewerModel ? ` · ${hit.reviewerModel}` : ''}
                    {hit.reason ? ` · ${hit.reason}` : ''}
                </Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <VisionButton
                    title={feedback.isPending ? 'Saving…' : 'Accept'}
                    disabled={feedback.isPending || reconciling}
                    onPress={() => void label('accepted')}
                />
                <VisionButton
                    title="Decline"
                    disabled={feedback.isPending || reconciling}
                    onPress={() => void label('declined')}
                />
                {showReplay && (
                    <VisionButton
                        title="Replay"
                        onPress={() =>
                            nav.navigate('visionReplay', {
                                groupId: hit.groupId,
                                id: hit.id,
                            })
                        }
                    />
                )}
                {review && (
                    <MenuView
                        title="Review"
                        actions={[
                            { id: 'uncertain', title: 'Uncertain' },
                            { id: 'unreviewed', title: 'Reset Review' },
                        ]}
                        onPressAction={({ nativeEvent }) => {
                            if (
                                nativeEvent.event === 'uncertain' ||
                                nativeEvent.event === 'unreviewed'
                            )
                                void label(nativeEvent.event);
                        }}
                    >
                        <View pointerEvents="none">
                            <VisionButton
                                title="More"
                                disabled={feedback.isPending || reconciling}
                                onPress={() => {}}
                            />
                        </View>
                    </MenuView>
                )}
            </View>
            {error && (
                <Text
                    accessibilityRole="alert"
                    style={{ color: t.textSecondary, fontSize: 13 }}
                >
                    {error}
                </Text>
            )}
            {retryChoice && (
                <VisionButton
                    title="Retry choice"
                    disabled={feedback.isPending}
                    onPress={() => void save(retryChoice)}
                />
            )}
        </View>
    );
}
