import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';

import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useInsets } from '@/app/useInsets';
import { AllowedMoves } from '@/components/AllowedMoves';
import InputModal from '@/components/InputModal';

export default function Page() {
    const { groupId, seasonId } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const insets = useInsets();

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Allowed Moves',
                    headerStyle: {
                        backgroundColor: '#1B1B1B',
                    },
                }}
            />
            <InputModal>
                <ScrollView
                    contentContainerStyle={{
                        paddingTop: insets.top,
                        paddingBottom: 32,
                    }}
                >
                    <AllowedMoves
                        moves={allowedMoves.map((i) => ({
                            id: i.id!,
                            name: i.name!,
                            finishingMove: i.finishingMove!,
                            pointsForScorer: i.pointsForScorer!,
                            pointsForTeam: i.pointsForTeam!,
                        }))}
                        onNewPress={() => {}}
                        editable={false}
                        footer="The rules of the ongoing season cannot be changed. To change what moves can be played, start a new season."
                    />
                </ScrollView>
            </InputModal>
        </>
    );
}
