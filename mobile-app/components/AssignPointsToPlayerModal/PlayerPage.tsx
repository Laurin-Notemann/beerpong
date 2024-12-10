import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { PerformedMove, TeamMember } from '@/api/utils/matchDtoToMatch';
import { theme } from '@/theme';

import Avatar from '../Avatar';
import Stepper from '../Stepper';
import Text from '../Text';

export default function PlayerPage({
    finishMove,
    player,
    setMoveCount,
}: {
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
                    <View
                        key={idx}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',

                            height: 44,
                            paddingLeft: 64,
                            paddingRight: 16,
                        }}
                    >
                        <Text
                            variant="body1"
                            color="primary"
                            style={{
                                marginRight: 'auto',
                            }}
                        >
                            {i.title}
                        </Text>
                        <Stepper
                            value={i.count}
                            onChange={(value) =>
                                setMoveCount(player.id, i.id, value)
                            }
                            min={0}
                        />
                    </View>
                ))}
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
