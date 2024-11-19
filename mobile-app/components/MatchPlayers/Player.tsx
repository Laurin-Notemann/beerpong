import React, { useRef } from 'react';
import {
    Animated,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import { theme } from '@/theme';

import Text from '../Text';

export interface PerformedMove {
    id: string;
    title: string;
    points: number;
    count: number;
}

export default function Player({
    id,
    avatarUrl,
    team,
    name,
    points,
    change,

    expanded,
    setIsExpanded,
    editable = false,

    moves,

    setMoveCount,
}: {
    id: string;
    avatarUrl?: string | null;
    team: 'red' | 'blue';
    name: string;
    points: number;
    change: number;

    expanded: boolean;
    setIsExpanded: (value: boolean) => void;
    editable?: boolean;

    moves: PerformedMove[];

    setMoveCount: (playerId: string, moveId: string, count: number) => void;
}) {
    const animation = useRef(new Animated.Value(0)).current; // start with height 0

    const toggleCollapse = () => {
        // Animate the height when toggling
        Animated.timing(animation, {
            toValue: expanded ? 0 : 1, // expand or collapse
            duration: 300, // animation duration in ms
            useNativeDriver: false, // we animate height, which cannot use native driver
        }).start();

        setIsExpanded(!expanded);
    };

    // Interpolate the animated value to control height
    const contentHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 44 * 8], // customize the height range based on your content
    });

    const navigation = useNavigation();

    // const [moves, setMoves] = useState(
    //     mockMoves.map((i) => ({ ...i, count: 0 }))
    // );

    return (
        <>
            <TouchableHighlight
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 76,
                    paddingHorizontal: 15,

                    borderTopWidth: 0.5,
                    borderTopColor: theme.panel.light.active,
                }}
                onPress={
                    editable
                        ? toggleCollapse
                        : () => navigation.navigate('player', { id })
                }
                underlayColor={theme.panel.light.active}
            >
                <>
                    <Avatar
                        url={avatarUrl}
                        size={40}
                        name={name}
                        borderColor={theme.color.team[team]}
                    />
                    <View style={{ marginLeft: 16 }}>
                        <Text variant="body1" color="primary">
                            {name}
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            {editable ? (
                                <Text variant="body2" color="tertiary">
                                    {points} points
                                </Text>
                            ) : (
                                <Text variant="body2" color="tertiary">
                                    {moves
                                        .map((i) => i.count + ' ' + i.title)
                                        .join(', ')}
                                </Text>
                            )}
                            <Icon
                                color={
                                    change >= 0
                                        ? theme.color.positive
                                        : theme.color.negative
                                }
                                size={8}
                                name="triangle"
                                style={{
                                    marginLeft: 8,
                                    marginRight: 2,
                                    marginTop: 1,
                                    transform:
                                        change >= 0
                                            ? undefined
                                            : [{ rotateX: '180deg' }],
                                }}
                            />
                            <Text
                                variant="body2"
                                color={change >= 0 ? 'positive' : 'negative'}
                            >
                                {Math.abs(change)}
                            </Text>
                        </View>
                    </View>
                    {editable ? (
                        <Icon
                            color={theme.icon.primary}
                            size={24}
                            name="chevron-down"
                            style={{ marginLeft: 'auto' }}
                        />
                    ) : (
                        <Icon
                            color={theme.icon.secondary}
                            size={24}
                            name="chevron-right"
                            style={{ marginLeft: 'auto' }}
                        />
                    )}
                </>
            </TouchableHighlight>
            {editable && (
                <Animated.View
                    style={[{ overflow: 'hidden', height: contentHeight }]}
                >
                    {moves.map((i, idx) => (
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
                            <TouchableOpacity
                                disabled={i.count < 1}
                                style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',

                                    width: 44,
                                    height: 44,

                                    opacity: i.count < 1 ? 0.2 : 1,
                                }}
                                onPress={() => {
                                    if (i.count > 0)
                                        setMoveCount(id, i.id, i.count - 1);
                                }}
                            >
                                <Icon
                                    color={theme.color.text.secondary}
                                    size={24}
                                    name="minus"
                                />
                            </TouchableOpacity>

                            <Text variant="body1" color="primary">
                                {i.count}
                            </Text>
                            <TouchableOpacity
                                style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',

                                    width: 44,
                                    height: 44,
                                }}
                                onPress={() => {
                                    setMoveCount(id, i.id, i.count + 1);
                                }}
                            >
                                <Icon
                                    color={theme.color.text.secondary}
                                    size={24}
                                    name="plus"
                                />
                            </TouchableOpacity>
                        </View>
                    ))}
                </Animated.View>
            )}
        </>
    );
}
