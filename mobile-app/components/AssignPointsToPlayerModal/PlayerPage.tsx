import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';
import { theme } from '@/theme';

import Avatar from '../Avatar';
import { ScoredMoveInputRow } from '../ScoredMoveInputRow';
import Stepper from '../Stepper';
import Text from '../Text';

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
    return (
        <View style={{ flex: 1 }}>
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
                <Text color="primary" variant="h3" style={{ marginTop: 8 }}>
                    {player.name}
                </Text>
                <Text color="secondary" style={{ marginTop: 16 }}>
                    How many cups did {player.name} score?
                </Text>
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
                    color="secondary"
                    style={{
                        marginTop: 16,
                        fontSize: 12,

                        paddingHorizontal: 48,
                    }}
                >
                    If {player.name} scored the last cup of the match, please
                    don't add it here. There is a seperate page for the winning
                    throw.
                </Text>
            </View>
            {finishMove && (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',

                        height: 44,
                        paddingLeft: 64,
                        paddingRight: 16,

                        marginTop: 16,
                    }}
                >
                    <Icon
                        name="crown-outline"
                        size={24}
                        color="#DCAB38"
                        style={{
                            marginRight: 8,
                        }}
                    />
                    <Text
                        variant="body1"
                        color="primary"
                        style={{
                            marginRight: 'auto',
                        }}
                    >
                        {finishMove.title}
                    </Text>
                    <Stepper value={1} min={1} max={1} />
                </View>
            )}
        </View>
    );
}
