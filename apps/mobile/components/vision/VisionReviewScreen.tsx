import { MenuView } from '@expo/ui/community/menu';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { useVisionReview, visionHitsOf } from '@/api/calls/visionHitHooks';
import { useNextTokens } from '@/components/next/tokens';
import { VisionButton, VisionHitCard } from '@/components/vision/VisionHitCard';
import { useInsets } from '@/lib/useInsets';

export default function VisionReviewScreen() {
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const [reviewOnly, setReviewOnly] = useState(true);
    const query = useVisionReview(groupId ?? null, reviewOnly);
    const t = useNextTokens();
    const insets = useInsets(true);
    const pages = query.data?.pages;
    const seen = new Set<string>();
    const hits = (
        Array.isArray(pages) ? pages.flatMap(visionHitsOf) : []
    ).filter((h) => {
        if (h.groupId !== groupId || seen.has(h.id)) return false;
        seen.add(h.id);
        return (
            !reviewOnly || h.label === 'uncertain' || h.label === 'unreviewed'
        );
    });
    return (
        <View style={{ flex: 1, backgroundColor: t.theme.color.bg }}>
            <Stack.Screen options={{ title: 'Camera review' }} />
            <FlatList
                data={hits}
                keyExtractor={(h) => h.id}
                contentContainerStyle={{
                    padding: 16,
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                    gap: 12,
                }}
                ListHeaderComponent={
                    <View style={{ gap: 12, marginBottom: 12 }}>
                        <Text style={{ color: t.textSecondary }}>
                            Review suggestions from live and archived matches.
                            Your choices help recognition; the score stays
                            unchanged.
                        </Text>
                        <MenuView
                            title="Camera review"
                            actions={[
                                {
                                    id: 'queue',
                                    title: 'Needs Review',
                                    state: reviewOnly ? 'on' : 'off',
                                },
                                {
                                    id: 'all',
                                    title: 'All Suggestions',
                                    state: reviewOnly ? 'off' : 'on',
                                },
                            ]}
                            onPressAction={({ nativeEvent }) =>
                                setReviewOnly(nativeEvent.event !== 'all')
                            }
                        >
                            <View pointerEvents="none">
                                <VisionButton
                                    title={
                                        reviewOnly
                                            ? 'Needs review ▾'
                                            : 'All suggestions ▾'
                                    }
                                    onPress={() => {}}
                                />
                            </View>
                        </MenuView>
                        {query.isError && (
                            <View style={{ gap: 8 }}>
                                <Text
                                    accessibilityRole="alert"
                                    style={{ color: t.textSecondary }}
                                >
                                    Couldn't refresh camera reviews. Saved
                                    suggestions are still shown.
                                </Text>
                                <VisionButton
                                    title="Retry"
                                    onPress={() => void query.refetch()}
                                />
                            </View>
                        )}
                    </View>
                }
                renderItem={({ item }) => <VisionHitCard hit={item} review />}
                refreshing={query.isRefetching && !query.isFetchingNextPage}
                onRefresh={() => void query.refetch()}
                ListEmptyComponent={
                    query.isPending ? (
                        <ActivityIndicator />
                    ) : !query.isError ? (
                        <Text style={{ color: t.textSecondary }}>
                            {reviewOnly
                                ? 'No suggestions need review. Unanswered suggestions appear here after 30 seconds.'
                                : 'No camera suggestions yet.'}
                        </Text>
                    ) : undefined
                }
                ListFooterComponent={
                    query.hasNextPage ? (
                        <VisionButton
                            title={
                                query.isFetchingNextPage
                                    ? 'Loading…'
                                    : 'Load more'
                            }
                            disabled={query.isFetchingNextPage}
                            onPress={() => void query.fetchNextPage()}
                        />
                    ) : undefined
                }
            />
        </View>
    );
}
