import React, { useRef } from 'react';
import {
    Animated,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { env } from '@/api/env';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import { theme } from '@/theme';

import Text from '../Text';

function Change({ value }: { value: number }) {
    return (
        <>
            <Icon
                color={value >= 0 ? theme.color.positive : theme.color.negative}
                size={8}
                name="triangle"
                style={{
                    marginLeft: 8,
                    marginRight: 2,
                    marginTop: 1,
                    transform: value >= 0 ? undefined : [{ rotateX: '180deg' }],
                }}
            />
            <Text variant="body2" color={value >= 0 ? 'positive' : 'negative'}>
                {Math.abs(value)}
            </Text>
        </>
    );
}

export interface PlayerProps {
    player: TeamMember;

    expanded: boolean;
    setIsExpanded: (value: boolean) => void;
    editable?: boolean;

    setMoveCount: (playerId: string, moveId: string, count: number) => void;
}
export default function Player({
    player: { id, avatarUrl, team, name, points, change, moves },

    expanded,
    setIsExpanded,
    editable = false,

    setMoveCount,
}: PlayerProps) {
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
        outputRange: [0, 44 * moves.length], // customize the height range based on your content
    });

    const nav = useNavigation();

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
                        : () => nav.navigate('player', { id })
                }
                underlayColor={theme.panel.light.active}
            >
                <>
                    <Avatar
                        url={avatarUrl}
                        size={40}
                        name={name}
                        borderColor={team ? theme.color.team[team] : undefined}
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
                                <Text
                                    variant="body2"
                                    color="tertiary"
                                    style={{
                                        fontStyle:
                                            moves.length < 1
                                                ? 'italic'
                                                : undefined,
                                    }}
                                >
                                    {moves.length < 1 && 'No moves'}
                                    {moves
                                        .filter((i) => i.count > 0)
                                        .map((i) => i.count + ' ' + i.title)
                                        .join(', ')}
                                </Text>
                            )}
                            {env.isDev && <Change value={change} />}
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
