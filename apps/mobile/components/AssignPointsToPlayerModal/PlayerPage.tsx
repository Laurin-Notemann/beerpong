import { ScrollView, View } from 'react-native';

import { PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { ScoredMoveInputRow } from '@/components/ScoredMoveInputRow';
import Text from '@/components/Text';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useTheme } from '@/theme';

export default function PlayerPage({
    hasSwipeTutorial = false,
    finishMove,
    player,
    setMoveCount,
}: {
    hasSwipeTutorial?: boolean;
    finishMove?: PerformedMove | null;
    player: TeamMember;
    setMoveCount: (playerId: string, moveId: string, count: number) => void;
}) {
    const theme = useTheme();
    const nav = useNavigation();

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 32 }}
        >
            <View
                style={{
                    width: '100%',
                    alignItems: 'center',
                    paddingTop: 32,
                    paddingBottom: 32,
                }}
            >
                <Avatar
                    name={player.name}
                    url={player.avatarUrl}
                    borderColor={theme.color.team[player.team!]}
                    size={96}
                />
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 8,
                    }}
                >
                    {finishMove && (
                        <Icon
                            name="crown"
                            size={22}
                            color={theme.color.team[player.team!]}
                        />
                    )}
                    <Text color="primary" variant="h3">
                        {player.name}
                    </Text>
                </View>
            </View>
            {player.moves
                .filter((i) => !i.isFinish)
                .map((i, idx) => (
                    <ScoredMoveInputRow
                        key={idx}
                        moveName={i.title}
                        numScored={i.count}
                        onNumScoredChange={(value) =>
                            setMoveCount(player.id, i.id, value)
                        }
                        hasTutorial={hasSwipeTutorial && idx === 1}
                    />
                ))}
            <View
                style={{
                    width: '100%',
                    alignItems: 'center',
                    paddingTop: 32,
                    paddingBottom: 32,
                }}
            >
                <Text
                    onPress={() => {
                        nav.goBack(); // dismiss the modal we're in
                        nav.navigate('allowedMoves');
                    }}
                    color="secondary"
                    style={{
                        marginTop: 16,
                        fontSize: 13,

                        paddingHorizontal: 48,

                        textAlign: 'center',
                    }}
                >
                    You can change what moves can be played in this group.{' '}
                    <Text color="link" style={{ fontSize: 13 }}>
                        Learn more
                    </Text>
                </Text>
            </View>
            {/* the finish isn't counted here: it's set on the sheet's last pages */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingHorizontal: 48,
                }}
            >
                <Icon
                    name="crown-outline"
                    size={16}
                    color={theme.color.text.secondary}
                />
                <Text
                    color="secondary"
                    style={{ fontSize: 13, textAlign: 'center', flexShrink: 1 }}
                >
                    {finishMove
                        ? `${player.name} finished with ${finishMove.title}. `
                        : ''}
                    Who finished and how is set at the end.
                </Text>
            </View>
        </ScrollView>
    );
}
