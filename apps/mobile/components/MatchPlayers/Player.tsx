import React, { useState } from 'react';
import {
    Animated,
    StyleProp,
    TouchableHighlight,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import { EloChangePill } from '@/components/EloChange';
import { Icon } from '@/components/Icon';
import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { formatRatingChange, plural } from '@/utils/format';

function Change({
    value,
    style,
}: {
    value: number;
    style?: StyleProp<ViewStyle>;
}) {
    const theme = useTheme();
    // unknown changes are 0; a change that rounds to 0 isn't worth showing either
    if (Math.round(value) === 0) return null;
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

    border?: boolean;
    /** how much their Elo changes with this match (a live one: if it ended now) */
    eloChange?: number;
}
export default function Player({
    player: { id, avatarUrl, team, name, points, change, moves },

    border = false,

    editable = false,

    setMoveCount,
    onPress,
    eloChange,
}: PlayerProps) {
    const [animation] = useState(() => new Animated.Value(0)); // start with height 0

    // Interpolate the animated value to control height
    const contentHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 44 * moves.length], // customize the height range based on your content
    });

    const performedMoves = moves.filter((i) => i.count > 0);
    const isFinisher = performedMoves.some((i) => i.isFinish);

    const theme = useTheme();

    return (
        <>
            <TouchableHighlight
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 76,
                    paddingHorizontal: 15,

                    borderTopWidth: border ? 0.5 : undefined,
                    borderTopColor: border
                        ? theme.panel.light.active
                        : undefined,
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
                        variant="list"
                    />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Text
                                variant="body1"
                                color="primary"
                                numberOfLines={1}
                                style={{ flexShrink: 1 }}
                            >
                                {name}
                            </Text>
                            {/* this player made the finishing throw */}
                            {isFinisher && (
                                <Icon
                                    name="crown"
                                    size={16}
                                    color={
                                        team
                                            ? theme.color.team[team]
                                            : theme.icon.primary
                                    }
                                />
                            )}
                        </View>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            {editable ? (
                                <Text variant="body2" color="tertiary">
                                    {plural(points, 'point', 'points')}
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
                    <EloChangePill
                        value={eloChange}
                        style={{ marginHorizontal: 8 }}
                    />
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
