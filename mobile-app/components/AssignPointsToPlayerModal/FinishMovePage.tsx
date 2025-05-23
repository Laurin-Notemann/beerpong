import { ScrollView, View } from 'react-native';

import { PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';
import Select from '@/components/Select';
import Text from '@/components/Text';
import { useScrollLockIfNotOverflowing } from '@/components/useScrollLockIfNotOverflowing';

export default function FinishMovePage({
    finisher,
    onSetFinishMove,
}: {
    finisher?: TeamMember | null;
    onSetFinishMove: (move: PerformedMove) => void;
}) {
    return (
        <View style={{ flex: 1, width: '100%' }}>
            <View
                style={{
                    alignItems: 'center',

                    flex: 1,

                    paddingTop: 32,
                }}
            >
                <Text
                    color="primary"
                    variant="h3"
                    style={{ paddingHorizontal: 16, textAlign: 'center' }}
                >
                    {finisher
                        ? `How did ${finisher.name} score the final cup?`
                        : 'Error'}
                </Text>
                <ScrollView
                    {...useScrollLockIfNotOverflowing()}
                    style={{
                        width: '100%',
                    }}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 96,
                        paddingBottom: 32,
                    }}
                >
                    <Select
                        items={(finisher?.moves ?? [])
                            .filter((i) => i.isFinish)
                            .map((i) => ({
                                value: i.id,
                                title: i.title,
                            }))}
                        value={
                            finisher?.moves.find(
                                (i) => i.isFinish && i.count > 0
                            )?.id
                        }
                        onChange={(move) =>
                            onSetFinishMove(
                                finisher?.moves.find((i) => i.id === move)!
                            )
                        }
                    />
                </ScrollView>
            </View>
        </View>
    );
}
