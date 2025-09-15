import React, { useRef } from 'react';
import {
    Animated,
    StyleProp,
    TextStyle,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { formatRatingChange } from '@/utils/format';

function Change({
    value,
    style,
}: {
    value: number;
    style?: StyleProp<TextStyle>;
}) {
    const theme = useTheme();
    return (
        <View
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                },
                style,
            ]}
        >
            <Icon
                color={value >= 0 ? theme.color.positive : theme.color.negative}
                size={8}
                name="triangle"
                style={{
                    marginRight: 2,
                    marginTop: 1,
                    transform:
                        value >= 0
                            ? // we can't simply have undefined when it's facing upwards,
                              // because this breaks with an really arcane
                              // "TypeError: Cannot read property 'forEach' of null",
                              // which is caused by not being able to animate to undefined
                              [{ rotateX: '0deg' }]
                            : [{ rotateX: '180deg' }],
                }}
            />
            <Text variant="body2" color={value >= 0 ? 'positive' : 'negative'}>
                {/* rounded to two decimal places with trailing zeros removed */}
                {formatRatingChange(value)}
            </Text>
        </View>
    );
}

export interface PlayerProps {
    player: TeamMember;

    expanded: boolean;
    setIsExpanded: (value: boolean) => void;
    editable?: boolean;

    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    onPress?: () => void;
}
export default function Player({
    player: { id, avatarUrl, team, name, points, change, moves },

    expanded,
    setIsExpanded,
    editable = false,

    setMoveCount,
    onPress,
}: PlayerProps) {
    const animation = useRef(new Animated.Value(0)).current; // start with height 0

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        outputRange: [0, 44 * moves.length], // customize the height range based on your content
    });

    const performedMoves = moves.filter((i) => i.count > 0);

    const theme = useTheme();

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
                onPress={onPress}
                underlayColor={theme.panel.light.active}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                    }}
                >
                    <Avatar
                        url={avatarUrl}
                        size={40}
                        name={name}
                        borderColor={team ? theme.color.team[team] : undefined}
                    />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text variant="body1" color="primary" numberOfLines={1}>
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
                                    {points} points{'  '}
                                    <Change
                                        value={change}
                                        style={{
                                            transform: [
                                                {
                                                    translateY: 3,
                                                },
                                            ],
                                        }}
                                    />
                                </Text>
                            ) : (
                                <Text
                                    variant="body2"
                                    color="tertiary"
                                    style={{
                                        fontStyle:
                                            performedMoves.length < 1
                                                ? 'italic'
                                                : undefined,
                                    }}
                                >
                                    {performedMoves.length < 1 &&
                                        'No cups scored'}
                                    {performedMoves
                                        .map((i) => i.count + ' ' + i.title)
                                        .join(', ')}
                                    {'  '}
                                    <Change
                                        value={change}
                                        style={{
                                            transform: [
                                                {
                                                    translateY: 3,
                                                },
                                            ],
                                        }}
                                    />
                                </Text>
                            )}
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
                </View>
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
