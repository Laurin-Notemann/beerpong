import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import Avatar from '@/components/Avatar';
import { useTheme } from '@/theme';

const RADIUS = 72;
const AVATAR_SIZE = 44;
const LABEL_WIDTH = 84;
/** distance from the touch origin needed to select a scorer */
const PICK_DISTANCE = 32;

/** player `i` of `n` sits around the cup, evenly spaced and symmetric around straight up */
const angleOf = (i: number, n: number) =>
    -Math.PI / 2 + (i + 0.5 - n / 2) * ((2 * Math.PI) / n);

/** the player a drag of (dx, dy) points at, once it's gone far enough */
export function pickedPlayer(n: number, dx: number, dy: number) {
    if (n === 0 || Math.hypot(dx, dy) < PICK_DISTANCE) return undefined;

    const drag = Math.atan2(dy, dx);
    const distance = (i: number) => {
        const diff = drag - angleOf(i, n);
        return Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
    };
    let picked = 0;
    for (let i = 1; i < n; i++) {
        if (distance(i) < distance(picked)) picked = i;
    }
    return picked;
}

/**
 * Pro mode's quick hit: dragging from a cup shows the players who can hit it around it. Dragging
 * towards one picks them (see pickedPlayer); the cups page records the hit when the finger lets
 * go. Only drawn, it never takes touches: the drag gesture keeps them.
 */
export function CupDragMenu({
    center,
    players,
    picked,
    color,
}: {
    /** the cup's middle, within its grid */
    center: { x: number; y: number };
    players: { id: string; name: string; avatarUrl?: string | null }[];
    picked: number | undefined;
    /** the scorers' team color */
    color: string;
}) {
    const theme = useTheme();
    const backdrop = RADIUS + AVATAR_SIZE / 2 + 12;

    return (
        <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(100)}
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: center.x,
                top: center.y,
                zIndex: 100,
            }}
        >
            <View
                style={{
                    position: 'absolute',
                    left: -backdrop,
                    top: -backdrop,
                    width: backdrop * 2,
                    height: backdrop * 2,
                    borderRadius: backdrop,
                    backgroundColor: theme.panel.dark.bg + 'CC',
                }}
            />
            {players.map((player, i) => {
                const angle = angleOf(i, players.length);
                const isPicked = picked === i;

                return (
                    <View
                        key={player.id}
                        style={{
                            position: 'absolute',
                            left: Math.cos(angle) * RADIUS - AVATAR_SIZE / 2,
                            top: Math.sin(angle) * RADIUS - AVATAR_SIZE / 2,
                            width: AVATAR_SIZE,
                            alignItems: 'center',
                            opacity: picked === undefined || isPicked ? 1 : 0.4,
                            transform: [{ scale: isPicked ? 1.2 : 1 }],
                        }}
                    >
                        <Avatar
                            size={AVATAR_SIZE}
                            name={player.name}
                            url={player.avatarUrl}
                            borderColor={color}
                        />
                        <Text
                            numberOfLines={1}
                            style={{
                                width: LABEL_WIDTH,
                                marginTop: 2,
                                textAlign: 'center',
                                color: theme.color.text.primary,
                                fontSize: 12,
                                fontWeight: '600',
                            }}
                        >
                            {player.name}
                        </Text>
                    </View>
                );
            })}
        </Animated.View>
    );
}
