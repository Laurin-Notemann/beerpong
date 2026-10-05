import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';

import InputModal from '@/components/InputModal';
import { LiveMatchRow } from '@/components/liveMatch/LiveMatchRow';
import { useLiveMatchesSheet } from '@/lib/liveMatch/useLiveMatchDock';
import { useInsets } from '@/lib/useInsets';

/**
 * Every live match of the group, opened from the dock's "+N" when more than one is running.
 * Picking one makes the dock show it.
 */
export default function Page() {
    const { groupId, matches, shownId, show } = useLiveMatchesSheet();
    const insets = useInsets();

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Live matches' }} />
            <InputModal>
                <ScrollView
                    // the cards' press scale shouldn't be clipped at the sides
                    style={{ marginHorizontal: -16 }}
                    contentContainerStyle={{
                        gap: 20,
                        paddingHorizontal: 16,
                        paddingBottom: insets.bottom + 16,
                    }}
                >
                    {groupId &&
                        matches.map((i) => (
                            <LiveMatchRow
                                key={i.id}
                                groupId={groupId}
                                match={i}
                                isShown={i.id === shownId}
                                onPress={() => show(i.id)}
                            />
                        ))}
                </ScrollView>
            </InputModal>
        </>
    );
}
