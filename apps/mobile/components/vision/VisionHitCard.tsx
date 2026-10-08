import { MenuView } from '@expo/ui/community/menu';
import { useRef, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

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
    const saving = useRef(false);
    const declineOpen = useRef(false);
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
        if (
            saving.current ||
            declineOpen.current ||
            feedback.isPending ||
            reconciling
        )
            return;
        saving.current = true;
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
        } finally {
            saving.current = false;
        }
    }
    function label(
        value: VisionHitFeedbackDto['label'],
        reason: VisionHitFeedbackDto['reason'] = null
    ) {
        // A new decision uses the displayed revision; a retry keeps its original CAS.
        return save({
            hit,
            label: value,
            source: review ? 'human-review' : 'player',
            reason,
        });
    }
    function decline() {
        if (
            saving.current ||
            declineOpen.current ||
            feedback.isPending ||
            reconciling
        )
            return;
        declineOpen.current = true;
        const choose = (
            reason: 'no-hit' | 'wrong-cup' | 'intentional-wetting'
        ) => {
            declineOpen.current = false;
            void label('declined', reason);
        };
        Alert.alert(
            'Why decline?',
            'No hit: the ball missed, hit the rim, or bounced out.\n\nWrong cup: the ball landed in a cup, but a different cup was highlighted.\n\nIntentional wetting: someone placed the ball in a cup to wet it.',
            [
                // Android supports three buttons; tapping outside or Back cancels.
                ...(Platform.OS === 'android'
                    ? []
                    : [
                          {
                              text: 'Cancel',
                              style: 'cancel' as const,
                              onPress: () => {
                                  declineOpen.current = false;
                              },
                          },
                      ]),
                { text: 'No hit', onPress: () => choose('no-hit') },
                { text: 'Wrong cup', onPress: () => choose('wrong-cup') },
                {
                    text: 'Intentional wetting',
                    onPress: () => choose('intentional-wetting'),
                },
            ],
            {
                cancelable: true,
                onDismiss: () => {
                    declineOpen.current = false;
                },
            }
        );
    }
    const reason =
        hit.reason === 'no-hit'
            ? 'No hit'
            : hit.reason === 'wrong-cup'
              ? 'Wrong cup'
              : hit.reason === 'intentional-wetting'
                ? 'Intentional wetting of the ball'
                : hit.reason;
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
                    {reason ? ` · ${reason}` : ''}
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
                    onPress={decline}
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
