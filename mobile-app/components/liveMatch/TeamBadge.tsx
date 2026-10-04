import { Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { CupTeam } from '@/lib/cupHits';
import { teamNames } from '@/lib/liveMatch/labels';
import { useTheme } from '@/theme';

export interface TeamBadgePlayer {
    id: string;
    name: string;
    avatarUrl?: string | null;
}

const MAX_AVATARS = 3;

const SIZES = {
    regular: { avatar: 28, fontSize: 14, gap: 4 },
    compact: { avatar: 20, fontSize: 13, gap: 6 },
};

/**
 * A team at a glance: up to three overlapping avatars ringed in the team color, then a "+N"
 * avatar for the rest, and the first names in one ellipsized line. `regular` stacks the names under the avatars, so long
 * names get the full width; `compact` (the dock) puts them side by side. `align="end"`
 * mirrors the badge for the team on the right.
 */
export function TeamBadge({
    team,
    players,
    size = 'regular',
    align = 'start',
    showNames = true,
}: {
    team: CupTeam;
    players: TeamBadgePlayer[];
    size?: keyof typeof SIZES;
    align?: 'start' | 'end';
    /** off where there's only room for the avatars; the accessibility label still names everyone */
    showNames?: boolean;
}) {
    const theme = useTheme();
    const s = SIZES[size];
    const isEnd = align === 'end';
    // half an avatar: four circles still fit next to the scores on a 320 pt screen
    const overlap = s.avatar / 2;

    const shown = players.slice(0, MAX_AVATARS);
    const rest = players.length - shown.length;
    const label = teamNames(players.map((i) => i.name));

    const avatars = (
        <View
            style={{
                flexDirection: isEnd ? 'row-reverse' : 'row',
                flexShrink: 0,
            }}
        >
            {[
                ...shown.map((i) => ({
                    key: i.id,
                    url: i.avatarUrl,
                    name: i.name,
                    content: undefined as string | undefined,
                })),
                ...(rest > 0
                    ? [
                          {
                              key: 'rest',
                              url: null,
                              name: '',
                              content: `+${rest}`,
                          },
                      ]
                    : []),
            ].map((i, idx) => (
                <Avatar
                    key={i.key}
                    url={i.url}
                    name={i.name}
                    content={i.content}
                    size={s.avatar}
                    borderColor={theme.color.team[team]}
                    variant="list"
                    style={
                        idx === 0
                            ? undefined
                            : isEnd
                              ? { marginRight: -overlap }
                              : { marginLeft: -overlap }
                    }
                />
            ))}
        </View>
    );

    const names = (
        <Text
            numberOfLines={1}
            style={{
                flexShrink: 1,
                minWidth: 0,
                // a bounded width, so a long line ellipsizes instead of overflowing
                alignSelf: size === 'regular' ? 'stretch' : undefined,
                color: theme.color.text.primary,
                fontSize: s.fontSize,
                fontWeight: '600',
                textAlign: isEnd ? 'right' : 'left',
            }}
        >
            {label}
        </Text>
    );

    return (
        <View
            accessibilityLabel={`${team === 'red' ? 'Red' : 'Blue'} team: ${players.map((i) => i.name).join(', ')}`}
            style={
                size === 'regular'
                    ? {
                          minWidth: 0,
                          gap: s.gap,
                          alignItems: isEnd ? 'flex-end' : 'flex-start',
                      }
                    : {
                          minWidth: 0,
                          gap: s.gap,
                          flexDirection: isEnd ? 'row-reverse' : 'row',
                          alignItems: 'center',
                      }
            }
        >
            {avatars}
            {showNames && names}
        </View>
    );
}
